export class CapacityManager {
  #capacity = 3;
  events = new EventTarget();

  async getCapacity(): Promise<void> {
    if (this.#capacity > 0) {
      this.#capacity--;
      console.log(`[capacity-manager] capacity decreased to ${this.#capacity}`);
    } else {
      await new Promise((resolve) => this.events.addEventListener("capacityincreased", resolve, { once: true }));
      return this.getCapacity();
    }
  }

  recoverAfterMs(timeoutMs: number) {
    setTimeout(() => {
      this.#capacity++;
      console.log(`[capacity-manager] capacity increased to ${this.#capacity}`);
      this.events.dispatchEvent(new Event("capacityincreased"));
    }, timeoutMs);
  }
}
