"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../src/engine/runtime/orchestrator");
const config = { api: { key: "secret", url: "http://api.example.com" } };
const state = {
  user: { id: 123, name: "Bolt" },
  params: { debug: true },
};
const item = { id: "item-1", value: 42 };
const testCases = [
  "Static string",
  "${config.api.url}",
  "Hello ${state.user.name}, your ID is ${state.user.id}",
  {
    url: "${config.api.url}/data",
    auth: "${config.api.key}",
    metadata: {
      user: "${state.user.id}",
      val: "${item.value}",
    },
  },
];
const ITERATIONS = 100000;
function bench() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    for (let j = 0; j < testCases.length; j++) {
      (0, orchestrator_1.resolveParams)(testCases[j], config, state, item);
    }
  }
  const end = performance.now();
  return end - start;
}
console.log(
  `Benchmarking resolveParams with ${ITERATIONS} iterations (warming up)...`,
);
bench();
bench();
console.log(`Running benchmark...`);
const total = bench();
console.log(`Total time: ${total.toFixed(2)}ms`);
console.log(
  `Average time per call: ${((total / (ITERATIONS * testCases.length)) * 1000).toFixed(4)}µs`,
);
//# sourceMappingURL=orchestrator_bench.js.map
