import { generateCipherProof } from '../src/crypto/proofGenerator';
import { verifyCryptographicProof } from '../src/crypto/verifier';

async function runBenchmark() {
    console.log("Starting Benchmark...");
    const testHash = "806_panhandle_channel_secure_signature";

    // Test Case 1: Fresh proofs (measuring decoding + hmac + binary comparison)
    const iterations = 1000;
    const freshProofs = Array.from({ length: iterations }, () => generateCipherProof(testHash).cipherProof);

    const startFresh = performance.now();
    for (const proof of freshProofs) {
        await verifyCryptographicProof(proof);
    }
    const endFresh = performance.now();
    const freshAvg = (endFresh - startFresh) / iterations;
    console.log(`[Fresh] Execution time for ${iterations} iterations: ${(endFresh - startFresh).toFixed(2)}ms`);
    console.log(`[Fresh] Average time per verification: ${freshAvg.toFixed(4)}ms`);

    // Test Case 2: Cached proofs (measuring LRU hit)
    const { cipherProof: cachedProof } = generateCipherProof(testHash);
    await verifyCryptographicProof(cachedProof); // Warm up cache

    const startCached = performance.now();
    for (let i = 0; i < iterations; i++) {
        await verifyCryptographicProof(cachedProof);
    }
    const endCached = performance.now();
    const cachedAvg = (endCached - startCached) / iterations;
    console.log(`[Cached] Execution time for ${iterations} iterations: ${(endCached - startCached).toFixed(2)}ms`);
    console.log(`[Cached] Average time per verification: ${cachedAvg.toFixed(4)}ms`);

    console.log(`⚡ Speedup for cached hits: ${(freshAvg / cachedAvg).toFixed(2)}x`);
}

runBenchmark().catch(console.error);
