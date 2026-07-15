export class FusionBuffer {
  private readonly FUSION_WINDOW = 500; // ms
  private events: any[] = [];

  push(event: any) {
    const now = Date.now();
    this.events.push({ ...event, timestamp: now });
    this.events = this.events.filter(
      (e) => now - e.timestamp <= this.FUSION_WINDOW,
    );
  }

  getSynchronizedBatch() {
    return this.events;
  }
}
