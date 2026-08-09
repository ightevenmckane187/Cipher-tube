import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

function runBenchmark() {
    console.log("--- PersistenceLayer Benchmark ---");
    const persistence = new PersistenceLayer();
    const key = "extremely-secure-quantum-cryptographic-key-for-sovereign-networks";
    const data = {
        id: "node-806",
        region: "us-east-secure",
        archetype: "SENTINEL",
        status: "AWAKENED",
        metrics: {
            cpu: 0.12,
            memory: 0.45,
            latency: 1.25,
            integrityVerified: true
        },
        allowedOps: ["FUSION", "COMMIT", "TRI_SHIFT"],
        manifest: {
            version: "1.5.0",
            gates: ["requirements_identification", "security_assurance"]
        }
    };

    // Warm up
    const warmUpIterations = 5000;
    for (let i = 0; i < warmUpIterations; i++) {
        const buf = persistence.save(data, key);
        persistence.verifyAndLoad(buf, key);
    }

    const iterations = 100000;
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        const buf = persistence.save(data, key);
        persistence.verifyAndLoad(buf, key);
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(`Processed ${iterations} save/load cycles in ${durationMs.toFixed(2)}ms`);
    console.log(`Average time per cycle: ${(durationMs / iterations).toFixed(6)}ms`);
    console.log("----------------------------------");
}

runBenchmark();
