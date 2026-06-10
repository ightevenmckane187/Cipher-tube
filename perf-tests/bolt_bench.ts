import { resolveParams } from '../src/engine/runtime/orchestrator';

const config = { api: { key: 'secret', url: 'http://api.example.com' } };
const state = {
  user: { id: 123, name: 'Bolt' },
  params: { debug: true }
};
const item = { id: 'item-1', value: 42 };

// A large object with NO templates
const staticObject: any = {};
for (let i = 0; i < 100; i++) {
    staticObject[`key${i}`] = `value${i}`;
}

const testCases = [
  staticObject
];

const ITERATIONS = 10000;

function bench() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    for (let j = 0; j < testCases.length; j++) {
        resolveParams(testCases[j], config, state, item);
    }
  }
  const end = performance.now();
  return end - start;
}

console.log(`Benchmarking resolveParams with large STATIC object, ${ITERATIONS} iterations (warming up)...`);
bench();
bench();

console.log(`Running benchmark...`);
const total = bench();

console.log(`Total time: ${total.toFixed(2)}ms`);
console.log(`Average time per call: ${(total / (ITERATIONS * testCases.length) * 1000).toFixed(4)}µs`);

// Verify CoW
const result = resolveParams(staticObject, config, state, item);
console.log(`Is CoW working (referential equality)? ${result === staticObject}`);
