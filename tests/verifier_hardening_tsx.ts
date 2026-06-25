
import { verifyCryptographicProof } from '../src/crypto/verifier';
import { generateCipherProof } from '../src/crypto/proofGenerator';

async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        console.log(`✅ PASS: ${name}`);
    } catch (err: any) {
        console.error(`❌ FAIL: ${name}`);
        console.error(err);
        process.exit(1);
    }
}

async function runTests() {
    console.log("Running Verifier Hardening Tests...");

    await test('should handle malformed JSON without logging "Critical" errors', async () => {
        const malformedProof = Buffer.from('{"salt": 123, "structuralHash": "abc", "challengeProof": "def", invalid}').toString('base64');
        const originalError = console.error;
        let loggedCritical = false;
        console.error = (msg) => {
            if (typeof msg === 'string' && msg.includes('Critical')) loggedCritical = true;
        };
        const result = await verifyCryptographicProof(malformedProof);
        console.error = originalError;

        if (result !== false) throw new Error("Should have returned false");
        if (loggedCritical) throw new Error("Should not have logged Critical error");
    });

    await test('should reject non-object payloads', async () => {
        const arrayProof = Buffer.from(JSON.stringify([1, 2, 3])).toString('base64');
        const result = await verifyCryptographicProof(arrayProof);
        if (result !== false) throw new Error("Should have returned false for array");
    });

    await test('should reject payloads with missing or invalid types', async () => {
        const badTypeProof = Buffer.from(JSON.stringify({
            salt: Date.now(),
            structuralHash: 123,
            challengeProof: true
        })).toString('base64');

        const result = await verifyCryptographicProof(badTypeProof);
        if (result !== false) throw new Error("Should have returned false for bad types");
    });

    await test('should reject overly large proof strings', async () => {
        const hugeProof = 'a'.repeat(10000);
        const result = await verifyCryptographicProof(hugeProof);
        if (result !== false) throw new Error("Should have returned false for huge proof");
    });

    await test('should not throw on timingSafeEqual length mismatch', async () => {
        const proof = {
            salt: Date.now(),
            structuralHash: 'test',
            challengeProof: 'short'
        };
        const encoded = Buffer.from(JSON.stringify(proof)).toString('base64');
        const result = await verifyCryptographicProof(encoded);
        if (result !== false) throw new Error("Should have returned false for length mismatch");
    });

    await test('should still verify valid proofs', async () => {
        const testHash = "valid_test_hash";
        const { cipherProof } = generateCipherProof(testHash);
        const result = await verifyCryptographicProof(cipherProof);
        if (result !== true) throw new Error("Should have returned true for valid proof");
    });

    console.log("\nAll Verifier Hardening Tests Passed!");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
