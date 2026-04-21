import crypto from 'crypto';
import { buildCipherTube, decryptCipherTube } from '../src/cta';

describe('Cipher Tube Assembly logic', () => {
  const masterSeed = crypto.randomBytes(32); // 256-bit seed
  const message = "Hello Jesse, this is a test message for the CTA system.";

  it('should successfully encrypt and decrypt a message', () => {
    const result = buildCipherTube(Buffer.from(message, 'utf8'), masterSeed);

    expect(result.tubes).toHaveLength(25); // 12 hash-locks + 13 encryption layers
    expect(result.ciphertext).toBeDefined();
    expect(result.audit.whatHappened).toHaveLength(25);

    const decrypted = decryptCipherTube(result.ciphertext, masterSeed, result.tubes);

    expect(decrypted.plaintext).toBe(message);
    expect(decrypted.audit.success).toBe(true);
  });

  it('should fail if the master seed is incorrect', () => {
    const result = buildCipherTube(Buffer.from(message, 'utf8'), masterSeed);
    const wrongSeed = crypto.randomBytes(32);

    expect(() => {
      decryptCipherTube(result.ciphertext, wrongSeed, result.tubes);
    }).toThrow();
  });

  it('should fail if the ciphertext is tampered with', () => {
    const result = buildCipherTube(Buffer.from(message, 'utf8'), masterSeed);
    const tamperedCiphertext = result.ciphertext.substring(0, result.ciphertext.length - 2) + '00';

    expect(() => {
      decryptCipherTube(tamperedCiphertext, masterSeed, result.tubes);
    }).toThrow();
  });

  it('should fail if hash-lock integrity check fails', () => {
    const result = buildCipherTube(Buffer.from(message, 'utf8'), masterSeed);

    // Tamper with one of the stored hashes in the tubes
    const tamperedTubes = JSON.parse(JSON.stringify(result.tubes));
    tamperedTubes[0].hash = crypto.randomBytes(64).toString('hex');

    expect(() => {
      decryptCipherTube(result.ciphertext, masterSeed, tamperedTubes);
    }).toThrow(/Integrity check failed/);
  });
});
