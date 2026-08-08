import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

async function runBenchmark() {
    console.log("--- PersistenceLayer Benchmark ---");
    const persistence = new PersistenceLayer();
    const testKey = "806_secure_key_performance_test";
    const testData = {
        state: "sovereign",
        active: true,
        region: 806,
        zone: "us-east-secure",
        metrics: {
            cpu: 12.5,
            memory: 512,
            latency: [1.2, 2.4, 0.8, 1.5]
        }
    };

    // Warm up
    for (let i = 0; i < 5000; i++) {
        const buf = persistence.save(testData, testKey);
        persistence.verifyAndLoad(buf, testKey);
    }

    const iterations = 100000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        const buf = persistence.save(testData, testKey);
        persistence.verifyAndLoad(buf, testKey);
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Processed ${iterations} save + verify cycles in ${durationMs.toFixed(2)}ms`);
    console.log(`Average time per cycle: ${(durationMs / iterations).toFixed(5)}ms`);
    console.log("----------------------------------");
}

runBenchmark().catch(console.error);
