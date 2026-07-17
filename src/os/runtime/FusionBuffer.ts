export class FusionBuffer {
    private readonly FUSION_WINDOW = 500; // ms
    private events: any[] = [];

    push(event: any) {
        const now = Date.now();
        this.events.push({ ...event, timestamp: now });

        // Bolt Optimization: Replace O(N) array filter on every push with an amortized O(1) loop pruning.
        // Since elements are pushed in chronological order, expired elements are always at the front.
        // Splice once to trim all expired elements at once, avoiding redundant array allocations.
        const limit = now - this.FUSION_WINDOW;
        let pruneCount = 0;
        const len = this.events.length;
        while (pruneCount < len && this.events[pruneCount].timestamp < limit) {
            pruneCount++;
        }
        if (pruneCount > 0) {
            this.events.splice(0, pruneCount);
        }
    }

    getSynchronizedBatch() {
        return this.events;
    }
}
