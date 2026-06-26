import { verifyCryptographicProof } from '../src/crypto/verifier';
import { generateCipherProof } from '../src/crypto/proofGenerator';

describe('Cryptographic Proof Verification Reproduction', () => {
    it('should verify a validly generated proof', async () => {
        const structuralHash = "test-structural-hash";
        const { cipherProof } = generateCipherProof(structuralHash);

        // This should return true if fixed, but currently it likely throws or returns false
        // due to the bugs (ReferenceError: computedProof is not defined, and others)
        const result = await verifyCryptographicProof(cipherProof);
        expect(result).toBe(true);
    });

    it('should reject a proof with an invalid challenge', async () => {
        const structuralHash = "test-structural-hash";
        const { cipherProof: validProof } = generateCipherProof(structuralHash);

        // Tamper with the proof
        const payload = JSON.parse(Buffer.from(validProof, 'base64').toString('utf8'));
        payload.challengeProof = '0'.repeat(64); // Wrong challenge
        const tamperedProof = Buffer.from(JSON.stringify(payload)).toString('base64');

        const result = await verifyCryptographicProof(tamperedProof);
        expect(result).toBe(false);
    });

    it('should reject a proof with a different length challenge', async () => {
        const structuralHash = "test-structural-hash";
        const { cipherProof: validProof } = generateCipherProof(structuralHash);

        // Tamper with the proof length
        const payload = JSON.parse(Buffer.from(validProof, 'base64').toString('utf8'));
        payload.challengeProof = 'abc'; // Wrong length
        const tamperedProof = Buffer.from(JSON.stringify(payload)).toString('base64');

        const result = await verifyCryptographicProof(tamperedProof);
        expect(result).toBe(false);
    });
});
