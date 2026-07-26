import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

const persistence = new PersistenceLayer();
const data = { secure: true, level: 42, host: 'us-east-secure', tag: 'sovereign-node' };
const key = 'my-secret-verification-key';

const ITERATIONS = 100000;

console.log(`Starting Persistence Benchmark with ${ITERATIONS} iterations...`);
const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const buffer = persistence.save(data, key);
    const loaded = persistence.verifyAndLoad(buffer, key);
}
const end = performance.now();
const total = end - start;
console.log(`Total time: ${total.toFixed(2)}ms`);
console.log(`Average cycle time: ${(total / ITERATIONS).toFixed(6)}ms`);
