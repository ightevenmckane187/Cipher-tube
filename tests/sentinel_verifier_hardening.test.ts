import { verifyCryptographicProof } from '../src/crypto/verifier';
import { generateCipherProof } from '../src/crypto/proofGenerator';
import crypto from 'crypto';

describe('Verifier Hardening', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('should handle malformed JSON without logging "Critical" errors (Log Flooding DoS)', async () => {
        const malformedProof = Buffer.from('{"salt": 123, "structuralHash": "abc", "challengeProof": "def", invalid}').toString('base64');
        const result = await verifyCryptographicProof(malformedProof);

        expect(result).toBe(false);
        // Current implementation logs "Critical: Security framework evaluation failure inside verifier engine:"
        // We want to avoid this for simple parsing errors.
        expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Critical'), expect.anything());
    });

    it('should reject non-object payloads', async () => {
        const arrayProof = Buffer.from(JSON.stringify([1, 2, 3])).toString('base64');
        const result = await verifyCryptographicProof(arrayProof);
        expect(result).toBe(false);
    });

    it('should reject payloads with missing or invalid types for structuralHash/challengeProof', async () => {
        const badTypeProof = Buffer.from(JSON.stringify({
            salt: Date.now(),
            structuralHash: 123, // Should be string
            challengeProof: true // Should be string
        })).toString('base64');

        const result = await verifyCryptographicProof(badTypeProof);
        expect(result).toBe(false);
    });

    it('should reject overly large proof strings (DoS)', async () => {
        const hugeProof = 'a'.repeat(10000);
        const result = await verifyCryptographicProof(hugeProof);
        expect(result).toBe(false);
    });

    it('should not throw on timingSafeEqual length mismatch', async () => {
        // crypto.timingSafeEqual throws if lengths are different in older Node.js versions
        // or if we pass unexpected types.
        const proof = {
            salt: Date.now(),
            structuralHash: 'test',
            challengeProof: 'short' // Not 64 chars
        };
        const encoded = Buffer.from(JSON.stringify(proof)).toString('base64');

        // This should return false, not throw an internal error that gets logged as Critical
        const result = await verifyCryptographicProof(encoded);
        expect(result).toBe(false);
        expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Critical'), expect.anything());
    });

    it('should still verify valid proofs', async () => {
        const testHash = "valid_test_hash";
        const { cipherProof } = generateCipherProof(testHash);
        const result = await verifyCryptographicProof(cipherProof);
        expect(result).toBe(true);
    });
});
