import { buildCipherTube, decryptCipherTube } from "../src/cta";
import crypto from "crypto";

const masterSeed = crypto.randomBytes(32);
const message = Buffer.from(
  "This is a secret message for benchmarking the Cipher Tube Assembly.",
);

function benchmark() {
  const iterations = 1000;

  console.log(`Starting benchmark with ${iterations} iterations...`);

  // Build once
  const result = buildCipherTube(message, masterSeed);

  // Benchmark buildCipherTube
  const startBuild = performance.now();
  for (let i = 0; i < iterations; i++) {
    buildCipherTube(message, masterSeed);
  }
  const endBuild = performance.now();
  const buildAvg = (endBuild - startBuild) / iterations;

  console.log(`Average buildCipherTube: ${buildAvg.toFixed(4)}ms`);

  // Benchmark decryptCipherTube
  const startDecrypt = performance.now();
  for (let i = 0; i < iterations; i++) {
    decryptCipherTube(result.ciphertext, masterSeed, result.tubes);
  }
  const endDecrypt = performance.now();
  const decryptAvg = (endDecrypt - startDecrypt) / iterations;

  console.log(`Average decryptCipherTube: ${decryptAvg.toFixed(4)}ms`);
}

benchmark();
