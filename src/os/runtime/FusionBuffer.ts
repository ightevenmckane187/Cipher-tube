/* eslint-disable @typescript-eslint/no-explicit-any */

export class FusionBuffer {
  private readonly FUSION_WINDOW = 500; // ms
  private events: any[] = [];

  push(event: any) {
    const now = Date.now();
    this.events.push({ ...event, timestamp: now });

    // Bolt Optimization: Prune expired events from the front of the queue in O(1) amortized time
    // using a while loop and a single splice instead of recreating the array with .filter().
    let pruneCount = 0;
    const eventsLen = this.events.length;
    while (
      pruneCount < eventsLen &&
      now - this.events[pruneCount].timestamp > this.FUSION_WINDOW
    ) {
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
