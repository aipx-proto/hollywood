import { useCallback } from "react";
import { tap } from "rxjs";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import { parseJsonStream } from "../lib/json-stream";
import type { AppState, Frame } from "../storyboard";

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
            `You are a Holywood storyboard artist. Create storyboard frames for the provided story. You have the freedom to consolidate, split, and reorder scenes into few key frames in a storyboard. Make sure the last frame concludes the story within the narrative.
For each frame, provide a title, and story description, and a visual snapshot. 
The story should be the narrative behind the frame. Do your best storytelling.
The visual snapshot is the decisive moment of the frame. Objectively describe the foreground, background, lighting, composition, camera angle and other visual design. Focus on the subject and scene. DO NOT mention art styles. 
Whenever there are characters in the visual snapshot, describe specific gender (either he or she), age (estimate to X years old), ethnicity, facial expression, hair color and style, body type and posture, and clothing instead. DO NOT mention character names.

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
      model: "gpt-4o",
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
              const frame = v.value as any as Frame;
              return {
                ...prev,
                frames: [
                  ...prev.frames,
                  {
                    ...frame,
                    image: `https://placehold.co/720?text=${encodeURIComponent(frame.title)}`,
                    visualSnapshot:
                      frame.visualSnapshot +
                      ` A stylized illustration rendered in a manner reminiscent of a detailed comic book or graphic novel. The color palette is muted, employing earth tones with a sepia undertone, accented by teal highlights.  The lighting is dramatic, with a strong focus on the central figure, creating a chiaroscuro effect.  The style features heavy use of cross-hatching and stippling to create texture and depth, giving the image a slightly gritty, almost vintage feel.  The lines are bold and confident, with a high level of detail in the rendering of textures and surfaces. The overall aesthetic is dark, moody, and intense.`,
                  },
                ],
              };
            });
          }
        }),
      )
      .subscribe();
  }, [state.story, state.characters]);

  return { generateStoryboardFrames };
}
