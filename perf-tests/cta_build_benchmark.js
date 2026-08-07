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
  "Performance optimization is key for Bolt ⚡",
  "utf8",
);
const ITERATIONS = 1000;
console.log(`Starting build benchmark with ${ITERATIONS} iterations...`);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  (0, cta_1.buildCipherTube)(plaintext, masterSeed);
}
const end = performance.now();
const totalTime = end - start;
const avgTime = totalTime / ITERATIONS;
console.log("-----------------------------------------");
console.log(`Total time: ${totalTime.toFixed(2)}ms`);
console.log(`Average time per build: ${avgTime.toFixed(4)}ms`);
console.log("-----------------------------------------");
//# sourceMappingURL=cta_build_benchmark.js.map
