import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type { LlmNode } from "./lib/ai-bar/lib/elements/llm-node";
import { loadAIBar } from "./lib/ai-bar/loader";
import { system, user } from "./lib/message";

import { filter, tap } from "rxjs";
import { parseJsonStream } from "./lib/json-stream";
import "./theater.css";

const llmNode = document.querySelector<LlmNode>("llm-node");

loadAIBar();

export interface AppState {
  targetAudience: string;
  audienceSims: AudienceSim[];
}

export interface AudienceSim {
  name: string;
  background: string;
}

function App() {
  const [state, setState] = useState<AppState>({
    targetAudience: "Outdoor activity enthusiasts who live in the Pacific Northwest",
    audienceSims: [],
  });

  const patchState = (patch: Partial<AppState>) => setState((p) => ({ ...p, ...patch }));

  const handleInviteAudience = async () => {
    const aoai = llmNode?.getClient();
    if (!aoai) return;

    patchState({ audienceSims: [] });

    const response = await aoai.chat.completions.create({
      stream: true,
      messages: [
        system`Generate a list of personas that would fit into the provided description. Respond in a valid JSON object of this type:

type Response = {
  personas: Persona[];
}

interface Persona = {
  name: string; /* imaginary name of the person */
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
        tap((v) => setState((s) => ({ ...s, audienceSims: [...s.audienceSims, v.value as any] }))),
      )
      .subscribe();
  };

  return (
    <div className="app-layout">
      <h2>Invite audience</h2>
      <textarea
        value={state.targetAudience}
        onChange={(e) => patchState({ targetAudience: e.target.value })}
      ></textarea>
      <button onClick={handleInviteAudience}>Invite</button>
      <div>
        {state.audienceSims.map((sim, i) => (
          <div key={i} className="audience-sim">
            <b>{sim.name}</b> <span>{sim.background}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
