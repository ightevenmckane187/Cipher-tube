"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const verifier_1 = require("../src/crypto/verifier");
const proofGenerator_1 = require("../src/crypto/proofGenerator");
async function runBenchmark() {
  console.log("--- Verifier Benchmark ---");
  const testHash = "performance_test_hash";
  const { cipherProof } = (0, proofGenerator_1.generateCipherProof)(testHash);
  // Warm up
  for (let i = 0; i < 1000; i++) {
    await (0, verifier_1.verifyCryptographicProof)(cipherProof);
  }
  const iterations = 50000;
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    await (0, verifier_1.verifyCryptographicProof)(cipherProof);
  }
  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1000000;
  console.log(
    `Processed ${iterations} iterations in ${durationMs.toFixed(2)}ms`,
  );
  console.log(
    `Average time per call: ${(durationMs / iterations).toFixed(4)}ms`,
  );
  console.log("--------------------------");
}
runBenchmark().catch(console.error);
//# sourceMappingURL=verifier_bench.js.map
