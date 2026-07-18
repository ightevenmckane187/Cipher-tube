import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

const persistence = new PersistenceLayer();
const data = {
    userId: "user-123456",
    state: "active",
    data: "Sovereign OS Core Sovereign Space is the Canonical Space".repeat(10),
    meta: {
        epoch: "pulse",
        strictness: 0.5,
    }
};
const key = "super-secret-persistence-key";

const N = 100000;

function runBench() {
    console.log(`Running PersistenceLayer benchmark with ${N} iterations...`);

    // Warm up
    for (let i = 0; i < 1000; i++) {
        const buf = persistence.save(data, key);
        persistence.verifyAndLoad(buf, key);
    }

    const start = performance.now();
    for (let i = 0; i < N; i++) {
        const buf = persistence.save(data, key);
        persistence.verifyAndLoad(buf, key);
    }
    const end = performance.now();
    const duration = end - start;

    console.log(`Completed ${N} save/load cycles in ${duration.toFixed(2)}ms`);
    console.log(`Average time per cycle: ${(duration / N).toFixed(4)}ms`);
}

runBench();
