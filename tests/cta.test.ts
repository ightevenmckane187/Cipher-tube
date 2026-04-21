import { buildCipherAssembly, verifyCipherAssembly } from '../src/cta';
import crypto from 'crypto';

describe('Cipher Tube Assembly (CTA)', () => {
    const seed = crypto.randomBytes(64);
    const plaintext = Buffer.from('Hello, Cipher Tube Assembly!');

    it('should correctly encrypt and decrypt a message through 25 layers', () => {
        const { payload, auditHash } = buildCipherAssembly(plaintext, seed);

        // Ensure payload is different from plaintext
        expect(payload).not.toEqual(plaintext);

        const result = verifyCipherAssembly(payload, seed, auditHash);

        expect(result.success).toBe(true);
        expect(result.plaintext?.toString()).toEqual(plaintext.toString());
    });

    it('should fail verification if the audit hash is tampered', () => {
        const { payload, auditHash } = buildCipherAssembly(plaintext, seed);
        const tamperedHash = auditHash.replace(/^[0-9a-f]/, (match) => (match === 'a' ? 'b' : 'a'));

        const result = verifyCipherAssembly(payload, seed, tamperedHash);
        expect(result.success).toBe(false);
    });

    it('should fail verification if the payload is tampered', () => {
        const { payload, auditHash } = buildCipherAssembly(plaintext, seed);
        const tamperedPayload = Buffer.from(payload);
        tamperedPayload[30] ^= 0xFF; // Flip some bits in the ciphertext

        const result = verifyCipherAssembly(tamperedPayload, seed, auditHash);
        expect(result.success).toBe(false);
    });

    it('should fail verification if a different seed is used', () => {
        const { payload, auditHash } = buildCipherAssembly(plaintext, seed);
        const wrongSeed = crypto.randomBytes(64);

        const result = verifyCipherAssembly(payload, wrongSeed, auditHash);
        expect(result.success).toBe(false);
    });
});
