import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { useState } from "react";
import { z } from "zod";
import type { AzureDalleNode } from "./ai-bar/lib/elements/image-gen-node";
import type { LlmNode } from "./ai-bar/lib/elements/llm-node";

export interface Storyboard {
  id: number;
  description: string;
  image?: string;
}

const storyResponseSchema = z.object({
  scenes: z.array(
    z.object({
      description: z.string(),
    }),
  ),
});

export function useScreenwriter() {
  const [prompt, setPrompt] = useState("10 second heart warming commercial for a local coffee brand");
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);

  const generateStory = async () => {
    const aoai = document.querySelector<LlmNode>("llm-node")!.getClient();

    const response = await aoai.beta.chat.completions.parse({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-mini",
      response_format: zodResponseFormat(storyResponseSchema, "story_response"),
    });

    console.log(response);
    const parsed = response.choices[0].message.parsed?.scenes ?? [];
    setStoryboards(
      parsed.map((scene, index) => ({
        id: index,
        description: scene.description,
      })),
    );
  };

  const generateImage = async (id: number) => {
    const description = storyboards.find((storyboard) => storyboard.id === id)?.description;
    if (!description) return;

    const dalle = document.querySelector<AzureDalleNode>("azure-dalle-node");
    const imageGen = await dalle?.generateImage({
      prompt: description,
      style: "vivid",
    });

    if (imageGen) {
      console.log({ imageGen });
      setStoryboards((prev) =>
        prev.map((storyboard) => (storyboard.id === id ? { ...storyboard, image: imageGen.data[0].url } : storyboard)),
      );
    }
  };

  return {
    generateStory,
    generateImage,
    prompt,
    setPrompt,
    storyboards,
  };
}
