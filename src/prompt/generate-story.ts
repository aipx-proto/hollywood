import { useCallback } from "react";
import { tap } from "rxjs";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import { parseJsonStream } from "../lib/json-stream";
import type { AppState, Character } from "../storyboard";

export interface UseGenerateStoryProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const llmNode = document.querySelector<LlmNode>("llm-node");

export function useGenerateStory(props: UseGenerateStoryProps) {
  const { state, setState } = props;

  const generateStory = useCallback(async () => {
    const client = await llmNode?.getClient();
    if (!client) return;

    const selectedNarrative = state.narratives.find((n) => n.selected);
    const selectedTechniques = state.techniques.filter((t) => t.selected);

    setState((prev) => ({ ...prev, story: "Generating story...", characters: [], acts: [] }));

    const response = await client.chat.completions.create({
      stream: true,
      messages: [
        {
          role: "system",
          content: `Help user write a story based on their goal, a narrative, and techniques. Describe the story, symbolic characters, and scenes in the following JSON format.
{
  story: string; // one sentence brief summary of the story
  characters: {
    symbolicRole: string; // the symbolic role in the archetypal narrative
    realRole: string; // the real role of the character in the story
    backstory: string; // backstory of the character
  }[];
  scenes: {
    title: string; // title of the scene
    description: string; // scene description
  }[];
}
          `,
        },
        {
          role: "user",
          content: `
          Goal: ${state.goal}

Theme: ${selectedNarrative?.name} - ${selectedNarrative?.description}

Techniques:
${selectedTechniques.map((t) => `${t.name} - ${t.definition}`).join("\n")}`.trim(),
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
          if (v.key === "story") {
            setState((prev) => ({ ...prev, story: v.value as string }));
          } else if (typeof v.key === "number" && v.stack.at(-1)?.key === "characters") {
            setState((prev) => ({
              ...prev,
              characters: [...prev.characters, v.value as any as Character],
            }));
          } else if (typeof v.key === "number" && v.stack.at(-1)?.key === "scenes") {
            setState((prev) => ({
              ...prev,
              acts: [...prev.acts, v.value as any],
            }));
          }
        }),
      )
      .subscribe();
  }, [state.goal, state.narratives, state.techniques]);

  return { generateStory };
}
