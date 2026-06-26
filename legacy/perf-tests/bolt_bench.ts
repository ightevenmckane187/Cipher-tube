import crypto from 'crypto';
import { buildCipherTube, decryptCipherTube } from '../src/cta';

const masterSeed = crypto.randomBytes(32);
const plaintext = Buffer.from('Performance optimization is key for Bolt ⚡'.repeat(10), 'utf8');

const ITERATIONS = 1000;

console.log(`Starting Build Benchmark with ${ITERATIONS} iterations...`);
const startBuild = performance.now();
let lastResult;
for (let i = 0; i < ITERATIONS; i++) {
    lastResult = buildCipherTube(plaintext, masterSeed);
}
const endBuild = performance.now();
console.log(`Average Build time: ${((endBuild - startBuild) / ITERATIONS).toFixed(4)}ms`);

const { ciphertext, tubes } = lastResult!;

console.log(`Starting Decrypt Benchmark with ${ITERATIONS} iterations...`);
const startDecrypt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    decryptCipherTube(ciphertext, masterSeed, tubes);
}
const endDecrypt = performance.now();
console.log(`Average Decrypt time: ${((endDecrypt - startDecrypt) / ITERATIONS).toFixed(4)}ms`);
