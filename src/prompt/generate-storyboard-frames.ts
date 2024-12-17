import { useCallback } from "react";
import { tap } from "rxjs";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import { parseJsonStream } from "../lib/json-stream";
import type { AppState } from "../storyboard";

export interface UseGenerateStoryboardFramesProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const llmNode = document.querySelector<LlmNode>("llm-node");

export function useGenerateStoryboardFrames(props: UseGenerateStoryboardFramesProps) {
  const { state, setState } = props;

  const generateStoryboardFrames = useCallback(async () => {
    const client = await llmNode?.getClient();
    if (!client) return;

    // clear the scenes
    setState((prev) => ({ ...prev, frames: [] }));

    const response = await client.chat.completions.create({
      stream: true,
      messages: [
        {
          role: "system",
          content:
            `You are a Holywood storyboard artist. Create storyboard frames for the provided story. You have the freedom to consolidate, split, and reorder scenes into few key frames in a storyboard.
For each frame, provide a title, and story description, and a visual snapshot. 
The story should be the narrative behind the frame. Do your best storytelling.
The visual snapshot is the decisive moment of the frame. Objectively describe the foreground, background, lighting, composition, camera angle and other visual design.
In visual snapshot, DO NOT mention character names. Describe specific gender (either he or she), ethnicity, facial expression, body posture instead. Be objective. DO NOT mention art styles. 

Respond in this JSON foramt;

{
  frames: {
    title: string; // title of the scene
    story: string;
    visualSnapshot: string; // scene description
  }[];
}



          `.trim(),
        },
        {
          role: "user",
          content: `
Characters:
${state.characters.map((c) => `${c.realRole}: ${c.backstory}`).join("\n")}

Story:
${state.acts.map((a) => `${a.description}`).join("\n")}

`.trim(),
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: {
        type: "json_object",
      },
    });

    parseJsonStream(response)
      .pipe(
        tap((v) => {
          if (typeof v.key === "number") {
            setState((prev) => {
              return {
                ...prev,
                frames: [...prev.frames, v.value as any],
              };
            });
          }
        }),
      )
      .subscribe();
  }, [state.story, state.characters]);

  return { generateStoryboardFrames };
}
