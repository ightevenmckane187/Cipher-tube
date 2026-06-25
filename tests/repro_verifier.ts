
import { verifyCryptographicProof } from '../src/crypto/verifier';
import { generateCipherProof } from '../src/crypto/proofGenerator';

async function runRepro() {
    console.log("--- Testing Valid Proof ---");
    try {
        const { cipherProof } = generateCipherProof("test-hash");
        const result = await verifyCryptographicProof(cipherProof);
        console.log("Valid proof result:", result);
    } catch (err: any) {
        console.error("Valid proof FAILED with error:", err.message);
    }

    console.log("\n--- Testing Malformed JSON Proof ---");
    try {
        const malformed = Buffer.from('{"salt": 123, "structuralHash": "abc", "challengeProof": "def", invalid}').toString('base64');
        const result = await verifyCryptographicProof(malformed);
        console.log("Malformed JSON result:", result);
    } catch (err: any) {
        console.error("Malformed JSON FAILED with error:", err.message);
    }
}

runRepro().catch(console.error);
