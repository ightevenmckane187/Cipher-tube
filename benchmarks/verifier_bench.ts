import { verifyCryptographicProof } from '../src/crypto/verifier';
import { generateCipherProof } from '../src/crypto/proofGenerator';

async function runBenchmark() {
    console.log("--- Verifier Benchmark ---");
    const testHash = "performance_test_hash";
    const { cipherProof } = generateCipherProof(testHash);

    // Warm up
    for (let i = 0; i < 1000; i++) {
        await verifyCryptographicProof(cipherProof);
    }

    const iterations = 50000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        await verifyCryptographicProof(cipherProof);
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Processed ${iterations} iterations in ${durationMs.toFixed(2)}ms`);
    console.log(`Average time per call: ${(durationMs / iterations).toFixed(4)}ms`);
    console.log("--------------------------");
}

runBenchmark().catch(console.error);
