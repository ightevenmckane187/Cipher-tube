export class SpatialEventBus {
  private listeners: Record<string, Function[]> = {};

  publish(event: string, payload: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((fn) => fn(payload));
    }
  }

  subscribe(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
}
