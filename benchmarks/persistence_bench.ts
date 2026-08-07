import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

function runBenchmark() {
    console.log("--- PersistenceLayer Benchmark ---");
    const persistence = new PersistenceLayer();
    const testKey = "sovereign_persistence_key";
    const data = {
        secure: true,
        level: 42,
        meta: {
            auth: "zero-trust",
            zone: "us-east-secure",
            archetype: "SENTINEL",
            active: true
        }
    };

    // Warm up
    for (let i = 0; i < 5000; i++) {
        const buf = persistence.save(data, testKey);
        persistence.verifyAndLoad(buf, testKey);
    }

    const iterations = 100000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        const buf = persistence.save(data, testKey);
        persistence.verifyAndLoad(buf, testKey);
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Processed ${iterations} save/load cycles in ${durationMs.toFixed(2)}ms`);
    console.log(`Average time per cycle: ${(durationMs / iterations).toFixed(4)}ms`);
    console.log("----------------------------------");
}

runBenchmark();
