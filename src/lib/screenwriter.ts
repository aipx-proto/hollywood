import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { useState } from "react";
import { z } from "zod";
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
  const [prompt, setPrompt] = useState("");
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
      model: "gpt-4o",
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

  return {
    generateStory,
    prompt,
    setPrompt,
    storyboards,
  };
}
