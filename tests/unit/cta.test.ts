import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { decryptCipherTube, Tube, MAX_LAYERS } from '../../src/cta';

describe('Cipher Tube Assembly (cta.ts) Security Boundaries', () => {
  const masterSeedHex = crypto.randomBytes(32).toString('hex');

  it('should validate masterSeed length and type constraints', () => {
    expect(() => decryptCipherTube([], '', 'short')).toThrow('Invalid masterSeed');
    expect(() => decryptCipherTube([], '', masterSeedHex.slice(0, 10))).toThrow('Invalid masterSeed');
  });

  it('should reject malformed or oversized tubes configurations', () => {
    const emptyTubes: Tube[] = [];
    expect(() => decryptCipherTube(emptyTubes, '00'.repeat(20), masterSeedHex)).toThrow(
      /Invalid tubes configuration/
    );

    const oversizedTubes: Tube[] = Array.from({ length: MAX_LAYERS + 1 }, (_, i) => ({
      layer: i,
      type: 'hash-lock',
      hash: '0'.repeat(128)
    })) as unknown as Tube[];
    expect(() => decryptCipherTube(oversizedTubes, '00'.repeat(20), masterSeedHex)).toThrow(
      /Invalid tubes configuration/
    );
  });

  it('should reject invalid ciphertext hex formats', () => {
    const validTube: Tube = { layer: 1, type: 'hash-lock', hash: '0'.repeat(128) } as unknown as Tube;
    expect(() => decryptCipherTube([validTube], 'ZZZZ', masterSeedHex)).toThrow(
      'Invalid ciphertext: Malformed hex string'
    );
    expect(() => decryptCipherTube([validTube], '010', masterSeedHex)).toThrow(
      'Invalid ciphertext: Malformed hex string'
    );
  });

  it('should detect hash-lock integrity tampering', () => {
    const data = Buffer.from('test-payload');
    const hash = crypto.createHash('sha512').update(data).digest('hex');
    
    const tube: Tube = { layer: 1, type: 'hash-lock', hash };
    
    // Tamper with one byte of the payload
    const tamperedData = Buffer.from('test-payloaX');

    expect(() => decryptCipherTube([tube], tamperedData.toString('hex'), masterSeedHex)).toThrow(
      /Integrity check failed/
    );
  });
});
