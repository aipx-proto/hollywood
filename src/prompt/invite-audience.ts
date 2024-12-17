import { useCallback } from "react";
import { filter, tap } from "rxjs";
import { allowedNames } from "../components/avatar-element";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import { parseJsonStream } from "../lib/json-stream";
import { system, user } from "../lib/message";
import type { AppState, AudienceSim } from "../storyboard";

export interface UseInviteAudienceProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  patchState: (patch: Partial<AppState>) => void;
}

const llmNode = document.querySelector<LlmNode>("llm-node");

export function useGenerateAudience(props: UseInviteAudienceProps) {
  const { state, setState, patchState } = props;

  const generateAudience = useCallback(
    async (count?: number) => {
      const aoai = llmNode?.getClient();
      if (!aoai) return;

      patchState({ audienceSims: [] });

      const randomizedAllowedNames = allowedNames
        .toSorted(() => Math.random() - 0.5)
        .map((name) => `"${name}"`)
        .join(" | ");

      const response = await aoai.chat.completions.create({
        stream: true,
        messages: [
          system`Generate a list of ${count ?? 3} personas that would fit into the provided description. Make sure only use the allowed names. Respond in a valid JSON object of this type:

type Response = {
  personas: Persona[];
}

interface Persona = {
  name: ${randomizedAllowedNames},
  background: string; /* profoundly personal background about this person */
}

        `,
          user`${state.targetAudience}`,
        ],
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: {
          type: "json_object",
        },
      });

      parseJsonStream(response)
        .pipe(
          filter((value) => typeof value.key === "number"),
          tap((v) => {
            const name = (v.value as any).name;
            if (!allowedNames.includes(name)) return;

            setState((s) => ({
              ...s,
              audienceSims: [...s.audienceSims, { ...(v.value as any), reactions: [], feedback: "" } as AudienceSim],
            }));
          }),
        )
        .subscribe();
    },
    [state.targetAudience],
  );

  return { generateAudience };
}
