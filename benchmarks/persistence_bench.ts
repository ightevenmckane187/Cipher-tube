import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

function runBenchmark() {
    console.log("--- PersistenceLayer Benchmark ---");
    const persistence = new PersistenceLayer();
    const testKey = "sovereign_benchmark_key_806";
    const testData = {
        id: "node-xyz-123",
        species: "Archetype",
        state: "ACTIVE",
        metadata: {
            mandate: "Restore the Return through harmonic ascent.",
            epoch: 1234567890,
            metrics: [0.1, 0.4, 0.9, 1.2],
            active: true
        }
    };

    // Warm up
    for (let i = 0; i < 5000; i++) {
        const buf = persistence.save(testData, testKey);
        persistence.verifyAndLoad(buf, testKey);
    }

    const iterations = 50000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const buf = persistence.save(testData, testKey);
        persistence.verifyAndLoad(buf, testKey);
    }
    const end = performance.now();
    const durationMs = end - start;

    console.log(`Processed ${iterations} save/load cycles in ${durationMs.toFixed(2)}ms`);
    console.log(`Average time per cycle: ${(durationMs / iterations).toFixed(4)}ms`);
    console.log("----------------------------------");
}

runBenchmark();
