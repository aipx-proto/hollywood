import type { ChatCompletionContentPart } from "openai/resources/index.mjs";
import { useCallback } from "react";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import { system } from "../lib/message";
import type { AppState } from "../storyboard";

export interface UseGenerateReactionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const llmNode = document.querySelector<LlmNode>("llm-node");

export function useGenerateReaction(props: UseGenerateReactionProps) {
  const { state, setState } = props;

  const generateReaction = useCallback(
    async (i: number) => {
      const aoai = llmNode?.getClient();
      if (!aoai) return;

      // for each audienceSim
      state.audienceSims.map(async (sim) => {
        const response = await aoai.chat.completions.create({
          messages: [
            system`You are invited to a commercial movie test screening event. Here is your profile:
          
Name: ${sim.name}
Background: ${sim.background}

The director will show you one scene at a time. Respond to the scene on screen with your reactions. Do not describe what you see. Instead, focus on your emotional reaction. You are encouraged to be critical and provide strong and unique perspectives`,
            // this sim's reaction to previous scenes
            ...state.frames.slice(0, i).flatMap((scene, sceneNumber) => [
              {
                role: "user" as const,
                content: [
                  {
                    type: "text",
                    text: scene.story,
                  } as ChatCompletionContentPart,
                  {
                    type: "image_url",
                    image_url: {
                      url: scene.image,
                    },
                  } as ChatCompletionContentPart,
                ],
              },
              {
                role: "assistant" as const,
                content: sim.reactions.at(sceneNumber),
              },
            ]),
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: state.frames[i].story,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: state.frames[i].image,
                  },
                } as ChatCompletionContentPart,
              ],
            },
          ],
          model: "gpt-4o-mini",
          temperature: 0.7,
        });

        const reaction = response.choices[0]?.message.content;
        if (!reaction) return;

        setState((prev) => ({
          ...prev,
          audienceSims: prev.audienceSims.map((s) => {
            if (s.name === sim.name) {
              return {
                ...s,
                reactions: [...(s.reactions ?? []), reaction],
              };
            }
            return s;
          }),
        }));
      });
    },
    [state.frames, state.audienceSims],
  );

  return { generateReaction };
}
