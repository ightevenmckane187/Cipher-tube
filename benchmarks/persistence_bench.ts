import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

const N = 500000;
const testKey = 'sovereign-test-key-of-good-length';
const testData = {
    id: '806_node_01',
    status: 'ACTIVE',
    signals: [1, 2, 3, 4, 5],
    metadata: {
        region: 'us-east-secure',
        sovereigntyRating: 99.9,
        nested: {
            deep: 'value'
        }
    }
};

const persistence = new PersistenceLayer();

function runBenchmark() {
    console.log(`Running PersistenceLayer Benchmark with ${N} cycles...`);

    // Warm up
    const warmBuf = persistence.save(testData, testKey);
    persistence.verifyAndLoad(warmBuf, testKey);

    console.time('PersistenceLayer SAVE');
    const buffers: Buffer[] = [];
    for (let i = 0; i < N; i++) {
        buffers.push(persistence.save(testData, testKey));
    }
    console.timeEnd('PersistenceLayer SAVE');

    console.time('PersistenceLayer LOAD/VERIFY');
    for (let i = 0; i < N; i++) {
        persistence.verifyAndLoad(buffers[i], testKey);
    }
    console.timeEnd('PersistenceLayer LOAD/VERIFY');
}

runBenchmark();
