"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const cta_1 = require("../src/cta");
const crypto_1 = __importDefault(require("crypto"));
const masterSeed = crypto_1.default.randomBytes(32);
const message = Buffer.from(
  "This is a secret message for benchmarking the Cipher Tube Assembly.",
);
function benchmark() {
  const iterations = 1000;
  console.log(`Starting benchmark with ${iterations} iterations...`);
  // Benchmark buildCipherTube
  const startBuild = performance.now();
  let lastResult;
  for (let i = 0; i < iterations; i++) {
    lastResult = (0, cta_1.buildCipherTube)(message, masterSeed);
  }
  const endBuild = performance.now();
  const buildAvg = (endBuild - startBuild) / iterations;
  console.log(`Average buildCipherTube: ${buildAvg.toFixed(4)}ms`);
  if (!lastResult) return;
  // Benchmark decryptCipherTube
  const startDecrypt = performance.now();
  for (let i = 0; i < iterations; i++) {
    (0, cta_1.decryptCipherTube)(
      lastResult.ciphertext,
      masterSeed,
      lastResult.tubes,
    );
  }
  const endDecrypt = performance.now();
  const decryptAvg = (endDecrypt - startDecrypt) / iterations;
  console.log(`Average decryptCipherTube: ${decryptAvg.toFixed(4)}ms`);
}
benchmark();
//# sourceMappingURL=benchmark_cta.js.map
