import crypto from 'crypto';
import { buildCipherTube, decryptCipherTube } from '../src/cta';

const masterSeed = crypto.randomBytes(32);
const plaintext = Buffer.from('Performance optimization is key for Bolt ⚡'.repeat(10), 'utf8');

const ITERATIONS = 10000;

function benchmarkBuild() {
    console.log(`Starting Build benchmark with ${ITERATIONS} iterations...`);
    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        buildCipherTube(plaintext, masterSeed);
    }
    const end = performance.now();
    const totalTime = end - start;
    console.log(`Build - Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Build - Average time: ${(totalTime / ITERATIONS).toFixed(4)}ms`);
}

function benchmarkDecrypt() {
    const { ciphertext, tubes } = buildCipherTube(plaintext, masterSeed);
    console.log(`Starting Decrypt benchmark with ${ITERATIONS} iterations...`);
    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        decryptCipherTube(ciphertext, masterSeed, tubes);
    }
    const end = performance.now();
    const totalTime = end - start;
    console.log(`Decrypt - Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Decrypt - Average time: ${(totalTime / ITERATIONS).toFixed(4)}ms`);
}

benchmarkBuild();
benchmarkDecrypt();
