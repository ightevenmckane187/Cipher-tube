import { buildCipherTube, decryptCipherTube } from '../src/cta';
import crypto from 'crypto';

const masterSeed = crypto.randomBytes(32);
const message = Buffer.from('This is a secret message for benchmarking the Cipher Tube Assembly.');

function benchmark() {
  const iterations = 1000;

  console.log(`Starting benchmark with ${iterations} iterations...`);

  // Benchmark buildCipherTube
  const startBuild = performance.now();
  let lastResult;
  for (let i = 0; i < iterations; i++) {
    lastResult = buildCipherTube(message, masterSeed);
  }
  const endBuild = performance.now();
  const buildAvg = (endBuild - startBuild) / iterations;

  console.log(`Average buildCipherTube: ${buildAvg.toFixed(4)}ms`);

  if (!lastResult) return;

  // Benchmark decryptCipherTube
  const startDecrypt = performance.now();
  for (let i = 0; i < iterations; i++) {
    decryptCipherTube(lastResult.ciphertext, masterSeed, lastResult.tubes);
  }
  const endDecrypt = performance.now();
  const decryptAvg = (endDecrypt - startDecrypt) / iterations;

  console.log(`Average decryptCipherTube: ${decryptAvg.toFixed(4)}ms`);
}

benchmark();
