import crypto from 'crypto';
import { buildCipherTube } from '../src/cta';

const masterSeed = crypto.randomBytes(32);
const plaintext = Buffer.from('Performance optimization is key for Bolt ⚡', 'utf8');

const ITERATIONS = 1000;
console.log(`Starting build benchmark with ${ITERATIONS} iterations...`);

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const result = buildCipherTube(plaintext, masterSeed);
    if (i === 0 && !result.ciphertext) {
        throw new Error('Build failed');
    }
}
const end = performance.now();

const totalTime = end - start;
const avgTime = totalTime / ITERATIONS;

console.log('-----------------------------------------');
console.log(`Total time: ${totalTime.toFixed(2)}ms`);
console.log(`Average time per build: ${avgTime.toFixed(4)}ms`);
console.log('-----------------------------------------');
