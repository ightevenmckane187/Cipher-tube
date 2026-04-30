import crypto from 'crypto';
import { buildCipherTube, decryptCipherTube } from '../src/cta';

const masterSeed = crypto.randomBytes(32);
const plaintext = Buffer.from('Performance optimization is key for Bolt ⚡', 'utf8');

console.log('Building sample Cipher Tube Assembly...');
const { ciphertext, tubes } = buildCipherTube(plaintext, masterSeed);

const ITERATIONS = 1000;
console.log(`Starting benchmark with ${ITERATIONS} iterations...`);

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const result = decryptCipherTube(ciphertext, masterSeed, tubes);
    if (i === 0 && result.plaintext !== plaintext.toString('utf8')) {
        throw new Error('Verification failed: Decrypted plaintext does not match original');
    }
}
const end = performance.now();

const totalTime = end - start;
const avgTime = totalTime / ITERATIONS;

console.log('-----------------------------------------');
console.log(`Total time: ${totalTime.toFixed(2)}ms`);
console.log(`Average time per decryption: ${avgTime.toFixed(4)}ms`);
console.log('-----------------------------------------');
