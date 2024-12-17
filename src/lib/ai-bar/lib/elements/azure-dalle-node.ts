import type { AIBar } from "../ai-bar";

export interface ImageGenerationResult {
  created: number;
  data: {
    revised_prompt: string;
    url: string;
  }[];
}

class CapacityManager {
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

const capacityManager = new CapacityManager();

export class AzureDalleNode extends HTMLElement {
  async generateImage(config: { prompt: string; style: "natural" | "vivid" }) {
    const credentials = this.closest<AIBar>("ai-bar")?.getAzureConnection();
    if (!credentials)
      throw new Error("Unable to get credentials from the closest <ai-bar>. Did you forget to provide them?");

    const fetchWithRetry = getFetchWithRetry(3);

    await capacityManager.getCapacity();

    const response = await fetchWithRetry(
      `${credentials.aoaiEndpoint}openai/deployments/dall-e-3/images/generations?api-version=2024-10-21`,
      {
        method: "POST",
        headers: {
          "api-key": credentials.aoaiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...config }),
      },
    )
      .then((res) => res.json())
      .then((result) => result as ImageGenerationResult)
      .finally(() => capacityManager.recoverAfterMs(60_000));

    if ((response as any).error) throw new Error((response as any).message);

    return response;
  }
}

export function defineAzureDalleNode() {
  customElements.define("azure-dalle-node", AzureDalleNode);
}

function getFetchWithRetry(backoff = 5, maxRetry = 3): typeof fetch {
  return async function fetchWithRetry(...parameters: Parameters<typeof fetch>) {
    let retryLeft = maxRetry;

    while (retryLeft > 0) {
      const response = await fetch(...parameters);

      if (response.status === 429) {
        retryLeft--;
        console.log(`[fetch-with-retry] will retry after ${backoff} seconds`);
        await new Promise((resolve) => setTimeout(resolve, backoff * 1000));
      } else {
        return response;
      }
    }

    throw new Error(`Failed to fetch after ${maxRetry} retries`);
  };
}
