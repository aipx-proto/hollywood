import type { AIBar } from "../ai-bar";

export interface ImageGenerationResult {
  created: number;
  data: {
    revised_prompt: string;
    url: string;
  }[];
}

export class AzureDalleNode extends HTMLElement {
  async generateImage(config: { prompt: string; style: "natural" | "vivid" }) {
    const credentials = this.closest<AIBar>("ai-bar")?.getAzureConnection();
    if (!credentials)
      throw new Error("Unable to get credentials from the closest <ai-bar>. Did you forget to provide them?");

    const response = await fetch(
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
      .then((result) => result as ImageGenerationResult);

    if ((response as any).error) throw new Error((response as any).message);

    return response;
  }
}

export function defineAzureDalleNode() {
  customElements.define("azure-dalle-node", AzureDalleNode);
}
