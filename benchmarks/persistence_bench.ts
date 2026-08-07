import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

const N = 100000;
const persistence = new PersistenceLayer();
const key = 'secure-key-for-testing';
const testData = {
    userId: 'user-id-12345',
    archetype: 'SENTINEL',
    role: 'ADMIN',
    activeSessions: 3,
    meta: {
        version: '1.5.0',
        environment: 'production',
        region: 'us-east-secure',
    }
};

function runBenchmark() {
    console.log(`=== PersistenceLayer Benchmark (${N} iterations) ===`);

    // Warm up
    for (let i = 0; i < 5000; i++) {
        const buf = persistence.save(testData, key);
        persistence.verifyAndLoad(buf, key);
    }

    // Benchmark Save
    const startSave = process.hrtime.bigint();
    const buffers: Buffer[] = new Array(N);
    for (let i = 0; i < N; i++) {
        buffers[i] = persistence.save(testData, key);
    }
    const endSave = process.hrtime.bigint();
    const saveTimeMs = Number(endSave - startSave) / 1_000_000;

    // Benchmark Verify & Load
    const startLoad = process.hrtime.bigint();
    for (let i = 0; i < N; i++) {
        persistence.verifyAndLoad(buffers[i], key);
    }
    const endLoad = process.hrtime.bigint();
    const loadTimeMs = Number(endLoad - startLoad) / 1_000_000;

    console.log(`Save:   ${saveTimeMs.toFixed(2)}ms total | ${(saveTimeMs / N).toFixed(5)}ms per cycle`);
    console.log(`Load:   ${loadTimeMs.toFixed(2)}ms total | ${(loadTimeMs / N).toFixed(5)}ms per cycle`);
    console.log(`Combined: ${(saveTimeMs + loadTimeMs).toFixed(2)}ms total | ${((saveTimeMs + loadTimeMs) / N).toFixed(5)}ms per cycle`);
}

runBenchmark();
