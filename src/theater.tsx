import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { filter, tap } from "rxjs";
import type { AzureDalleNode } from "./lib/ai-bar/lib/elements/image-gen-node";
import type { LlmNode } from "./lib/ai-bar/lib/elements/llm-node";
import { loadAIBar } from "./lib/ai-bar/loader";
import { parseJsonStream } from "./lib/json-stream";
import { system, user } from "./lib/message";

import type { ChatCompletionContentPart } from "openai/resources/index.mjs";
import "./theater.css";

const llmNode = document.querySelector<LlmNode>("llm-node");

loadAIBar();

export interface AppState {
  targetAudience: string;
  audienceSims: AudienceSim[];
  scenes: Scene[];
}

export interface AudienceSim {
  name: string;
  background: string;
  memory: string[];
}

export interface Scene {
  description: string;
  image?: string;
}

function App() {
  const [state, setState] = useState<AppState>({
    targetAudience: "Outdoor activity enthusiasts who live in the Pacific Northwest",
    audienceSims: [],
    scenes: [],
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

  const handleShowScene = async (i: number) => {
    const azureDalleNode = document.querySelector<AzureDalleNode>("azure-dalle-node");
    if (!azureDalleNode) return;

    const img = await azureDalleNode.generateImage({
      prompt: state.scenes[i].description,
      style: "vivid",
    });

    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, j) => (j === i ? { ...scene, image: img.data.at(0)?.url } : scene)),
    }));
  };

  const handleReact = async (i: number) => {
    const aoai = llmNode?.getClient();
    if (!aoai) return;

    const response = await aoai.chat.completions.create({
      messages: [
        system`React to the scene with a short description of what you see.
        `,
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: state.scenes[i].image,
              },
            } as ChatCompletionContentPart,
          ],
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
    });

    console.log(response.choices[0]?.message.content);
  };

  const handleAddScene = () => {
    patchState({
      scenes: [
        ...state.scenes,
        {
          description: "A beautiful sunset over the mountains",
        },
      ],
    });
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

      <h2>Screening</h2>

      <button onClick={handleAddScene}>Add scene</button>

      {state.scenes.map((scene, i) => (
        <div key={i} className="scene">
          <textarea
            value={scene.description}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                scenes: prev.scenes.map((s, j) => (j === i ? { ...s, description: e.target.value } : s)),
              }))
            }
          ></textarea>
          <button onClick={() => handleShowScene(i)}>Show</button>
          <img src={scene.image} width={320} alt={scene.description} />
          <button onClick={() => handleReact(i)}>React</button>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
