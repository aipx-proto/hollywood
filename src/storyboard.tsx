import type { ChatCompletionContentPart } from "openai/resources/index.mjs";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { filter, tap } from "rxjs";
import { narratives, type Narrative } from "./data/narratives";
import { techniques, type Technique } from "./data/techniques";
import type { AzureDalleNode } from "./lib/ai-bar/lib/elements/image-gen-node";
import type { LlmNode } from "./lib/ai-bar/lib/elements/llm-node";
import { loadAIBar } from "./lib/ai-bar/loader";
import { parseJsonStream } from "./lib/json-stream";
import { system, user } from "./lib/message";
import "./storyboard.css";

const llmNode = document.querySelector<LlmNode>("llm-node");

loadAIBar();

export interface AppState {
  goal: string;
  narratives: Narrative[];
  story: string;
  characters: Character[];
  scenes: Scene[];
  techniques: Technique[];
  targetAudience: string;
  audienceSims: AudienceSim[];
}

export interface Character {
  name: string;
  background: string;
}

export interface Scene {
  title: string;
  description: string;
  image?: string;
}

export interface AudienceSim {
  name: string;
  background: string;
  reactions: string[];
}

function App() {
  const [state, setState] = useState<AppState>({
    goal: "Promote a coffee brand for diverse communities in Seattle",
    narratives: narratives,
    story: "",
    characters: [],
    scenes: [],
    techniques: techniques,
    targetAudience: "Outdoor activity enthusiasts who live in the Pacific Northwest",
    audienceSims: [],
  });

  const patchState = (patch: Partial<AppState>) => setState((p) => ({ ...p, ...patch }));

  const handleGenerateStory = async () => {
    const client = await llmNode?.getClient();
    if (!client) return;

    const selectedNarrative = state.narratives.find((n) => n.selected);
    const selectedTechniques = state.techniques.filter((t) => t.selected);

    setState((prev) => ({ ...prev, story: "Generating story..." }));

    const response = await client.chat.completions.create({
      stream: true,
      messages: [
        {
          role: "system",
          content: `Help user write a story based on their goal, a narrative, and techniques. Respond in this JSON format
{
  story: string; // one sentence brief summary of the story
  characters: {
    abstractRole: string; // the abstract role in the narrative
    concreteRole: string; // the concrete role of the character in the story
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
      model: "gpt-4o",
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
          } else if (typeof v.key === "number") {
            setState((prev) => ({
              ...prev,
              characters: [
                ...prev.characters,
                { name: (v.value as any).concreteRole, background: (v.value as any).abstractRole },
              ],
            }));
          }
        }),
      )
      .subscribe();
  };

  const handleGenerateScenes = async () => {
    const client = await llmNode?.getClient();
    if (!client) return;

    // clear the scenes
    setState((prev) => ({ ...prev, scenes: [] }));

    const selectedNarrative = state.narratives.find((n) => n.selected);
    const selectedTechniques = state.techniques.filter((t) => t.selected);
    const response = await client.chat.completions.create({
      stream: true,
      messages: [
        {
          role: "system",
          content: `Use the provided Theme, Story, Characters, and Techniques to develop cinematographic oriented commercial. Describe the scenes in this JSON format
{
  scenes: {
    title: string; // title of the scene
    description: string; // description of the scene
  }[];
}
          `,
        },
        {
          role: "user",
          content: `
Theme: ${selectedNarrative?.name} - ${selectedNarrative?.description}

Story: ${state.story}

Characters:
${state.characters.map((c) => `${c.name} - ${c.background}`).join("\n")}

Techniques:
${selectedTechniques.map((t) => `${t.name} - ${t.definition}`).join("\n")}
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
              return {
                ...prev,
                scenes: [...prev.scenes, v.value as any],
              };
            });
          }
        }),
      )
      .subscribe();
  };

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
          title: "New scene",
          description: "A beautiful sunset over the mountains",
        },
      ],
    });
  };

  return (
    <div className="app-layout">
      <h2>Goal</h2>
      <textarea value={state.goal} onChange={(e) => setState((prev) => ({ ...prev, goal: e.target.value }))}></textarea>

      <h2>Narrative</h2>
      <div className="narrative-board">
        {state.narratives.map((n) => (
          <button
            className="narrative-option"
            aria-pressed={!!n.selected}
            key={n.name}
            onClick={() =>
              setState((prev) => ({
                ...prev,
                narratives: prev.narratives.map((narrative) => ({
                  ...narrative,
                  selected: narrative.name === n.name,
                })),
              }))
            }
          >
            <b>{n.name}</b>
            <span>{n.description}</span>
          </button>
        ))}
      </div>

      <h2>Add-ons</h2>

      <div className="narrative-board">
        {state.techniques.map((techniques) => (
          <button
            className="narrative-option"
            key={techniques.name}
            aria-pressed={!!techniques.selected}
            onClick={() =>
              setState((prev) => ({
                ...prev,
                techniques: prev.techniques.map((technique) => ({
                  ...technique,
                  selected: technique.name === techniques.name ? !technique.selected : technique.selected,
                })),
              }))
            }
          >
            <b>{techniques.name}</b>
            <p title={techniques.example}>{techniques.definition}</p>
          </button>
        ))}
      </div>

      <h2>Story</h2>
      <div>
        <button onClick={handleGenerateStory}>Generate</button>
      </div>
      <textarea
        value={state.story}
        onChange={(e) => setState((prev) => ({ ...prev, story: e.target.value }))}
      ></textarea>

      {state.characters.length > 0 ? (
        <div className="character-grid">
          {state.characters.map((c) => (
            <div className="character-card" key={c.name}>
              <b>{c.background}</b>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      ) : null}

      <h2>Cinematography</h2>
      <div>
        <button onClick={handleGenerateScenes}>Generate</button>
        <button>Revise</button>
      </div>

      <div className="scene-list">
        {state.scenes.map((scene, i) => (
          <div key={i} className="scene-card">
            <b>{scene.title}</b>
            <p>{scene.description}</p>
            <button onClick={() => handleShowScene(i)}>Visualize</button>
            <button onClick={() => handleReact(i)}>Screen</button>
            {scene.image ? <img src={scene.image} alt={scene.title} /> : null}
          </div>
        ))}
      </div>

      <h2>Invite audience</h2>
      <textarea
        value={state.targetAudience}
        onChange={(e) => setState((prev) => ({ ...prev, targetAudience: e.target.value }))}
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
