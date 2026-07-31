import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

function runBenchmark() {
    console.log("--- PersistenceLayer Benchmark ---");
    const persistence = new PersistenceLayer();
    const testKey = "sovereign_secret_key";
    const testData = {
        id: "usr_123456",
        realm: "Holland Core",
        mandate: "Protect and optimize",
        metrics: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        active: true
    };

    // Warm up
    for (let i = 0; i < 5000; i++) {
        const buffer = persistence.save(testData, testKey);
        persistence.verifyAndLoad(buffer, testKey);
    }

    const iterations = 50000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        const buffer = persistence.save(testData, testKey);
        persistence.verifyAndLoad(buffer, testKey);
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Processed ${iterations} save/verify cycles in ${durationMs.toFixed(2)}ms`);
    console.log(`Average time per cycle: ${(durationMs / iterations).toFixed(4)}ms`);
    console.log("----------------------------------");
}

runBenchmark();
