/* eslint-disable @typescript-eslint/no-explicit-any */
export class FusionBuffer {
    private readonly FUSION_WINDOW = 500; // ms
    private events: any[] = [];

    push(event: any) {
        const now = Date.now();
        this.events.push({ ...event, timestamp: now });

        // Bolt Optimization: Replace O(N) array recreation (filter) with amortized O(1) prune.
        // Since events are pushed with monotonic timestamps, we can stop scanning
        // as soon as we find the first event within the window.
        const cutoff = now - this.FUSION_WINDOW;
        let pruneCount = 0;
        while (pruneCount < this.events.length && this.events[pruneCount].timestamp < cutoff) {
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
