"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const cta_1 = require("../src/cta");
const masterSeed = crypto_1.default.randomBytes(32);
const plaintext = Buffer.from(
  "Performance optimization is key for Bolt ⚡".repeat(10),
  "utf8",
);
const ITERATIONS = 1000;
console.log(`Starting Build Benchmark with ${ITERATIONS} iterations...`);
const startBuild = performance.now();
let lastResult;
for (let i = 0; i < ITERATIONS; i++) {
  lastResult = (0, cta_1.buildCipherTube)(plaintext, masterSeed);
}
const endBuild = performance.now();
console.log(
  `Average Build time: ${((endBuild - startBuild) / ITERATIONS).toFixed(4)}ms`,
);
const { ciphertext, tubes } = lastResult;
console.log(`Starting Decrypt Benchmark with ${ITERATIONS} iterations...`);
const startDecrypt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  (0, cta_1.decryptCipherTube)(ciphertext, masterSeed, tubes);
}
const endDecrypt = performance.now();
console.log(
  `Average Decrypt time: ${((endDecrypt - startDecrypt) / ITERATIONS).toFixed(4)}ms`,
);
//# sourceMappingURL=bolt_bench.js.map
