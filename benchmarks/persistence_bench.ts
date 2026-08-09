import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

function runBenchmark() {
    console.log("--- PersistenceLayer Benchmark ---");
    const persistence = new PersistenceLayer();
    const testKey = 'sovereign-channel-key-for-testing';
    const payload = {
        secure: true,
        level: 42,
        metadata: {
            channelId: '806-secure-zone',
            timestamp: Date.now(),
            nested: {
                data: 'Some nested string payload to make it a bit larger than standard primitive'
            }
        }
    };

    // Warm up
    for (let i = 0; i < 5000; i++) {
        const buf = persistence.save(payload, testKey);
        persistence.verifyAndLoad(buf, testKey);
    }

    const iterations = 50000;
    const startSave = process.hrtime.bigint();
    let savedBuf!: Buffer;
    for (let i = 0; i < iterations; i++) {
        savedBuf = persistence.save(payload, testKey);
    }
    const endSave = process.hrtime.bigint();
    const saveDurationMs = Number(endSave - startSave) / 1_000_000;

    const startLoad = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        persistence.verifyAndLoad(savedBuf, testKey);
    }
    const endLoad = process.hrtime.bigint();
    const loadDurationMs = Number(endLoad - startLoad) / 1_000_000;

    console.log(`Saved ${iterations} iterations in ${saveDurationMs.toFixed(2)}ms (Avg: ${(saveDurationMs / iterations).toFixed(5)}ms per call)`);
    console.log(`Loaded/Verified ${iterations} iterations in ${loadDurationMs.toFixed(2)}ms (Avg: ${(loadDurationMs / iterations).toFixed(5)}ms per call)`);
    console.log(`Combined cycle average: ${((saveDurationMs + loadDurationMs) / iterations).toFixed(5)}ms`);
    console.log("----------------------------------");
}

runBenchmark();
