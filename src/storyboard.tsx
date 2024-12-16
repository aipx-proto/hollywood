import type { ChatCompletionContentPart } from "openai/resources/index.mjs";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { tap } from "rxjs";
import { Avartar } from "./components/avatar-element";
import { narratives, type Narrative } from "./data/narratives";
import { techniques, type Technique } from "./data/techniques";
import type { AzureDalleNode } from "./lib/ai-bar/lib/elements/image-gen-node";
import type { LlmNode } from "./lib/ai-bar/lib/elements/llm-node";
import { loadAIBar } from "./lib/ai-bar/loader";
import { parseJsonStream } from "./lib/json-stream";
import { system, user } from "./lib/message";
import { useInviteAudience } from "./prompt/invite-audience";
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
  feedback: string;
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

  const { handleInviteAudience } = useInviteAudience({ state, setState, patchState });

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
          content:
            `Use the provided Theme, Story, Characters, and Techniques to develop cinematographic oriented commercial. Describe the scenes in the following JSON format.
Each scene description should capture only one key moment. Include foreground, background, lighting, composition, camera positioning. Keep it simple. Do NOT mention art style. Do NOT describe motion. Still frame only.

{
  scenes: {
    title: string; // title of the scene
    description: string; // scene description
  }[];
}

          `.trim(),
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
                scenes: [...prev.scenes, v.value as any],
              };
            });
          }
        }),
      )
      .subscribe();
  };

  const handleShowScene = async (i: number) => {
    const azureDalleNode = document.querySelector<AzureDalleNode>("azure-dalle-node");
    if (!azureDalleNode) return;

    // show placeholder
    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, j) => (j === i ? { ...scene, image: "https://placehold.co/1024" } : scene)),
    }));

    const img = await azureDalleNode.generateImage({
      prompt:
        state.scenes[i].description +
        ` Lithographic, Moebius style with color blocking, well-defined outlines, similar to Sable`,
      style: "natural",
    });

    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, j) => (j === i ? { ...scene, image: img.data.at(0)?.url } : scene)),
    }));
  };

  const handleReact = async (i: number) => {
    const aoai = llmNode?.getClient();
    if (!aoai) return;

    // for each audienceSim
    state.audienceSims.map(async (sim) => {
      const response = await aoai.chat.completions.create({
        messages: [
          system`You are invited to a commercial movie test screening event. Here is your profile:
          
Name: ${sim.name}
Background: ${sim.background}

The director will show you one scene at a time. Respond to the scene on screen with your reactions. Do not describe what you see. Instead, focus on your emotional reaction. You are encouraged to be critical.`,
          // this sim's reaction to previous scenes
          ...state.scenes.slice(0, i).flatMap((scene, sceneNumber) => [
            {
              role: "user" as const,
              content: [
                {
                  type: "text",
                  text: scene.description,
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
                text: state.scenes[i].description,
              },
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
  };

  const handleGetFeedback = async (i: number) => {
    const aoai = llmNode?.getClient();
    if (!aoai) return;

    const response = await aoai.chat.completions.create({
      messages: [
        system`You are invited to a commercial movie test screening event. Here is your profile:

Name: ${state.audienceSims[i].name}
Background: ${state.audienceSims[i].background}

You already watched a commericial and provided your critical feedback:

${state.audienceSims[i].reactions
  .map(
    (reaction, j) => `Scene ${j + 1}: ${state.scenes[j].description}{
Scene ${j + 1} reaction: ${reaction}`,
  )
  .join("\n")}
`,
        user`Please provide your critcial feedback on the commercial you watched. Also suggest improvement or alernative ideas to make it better`,
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
    });

    const feedback = response.choices[0]?.message.content;
    if (!feedback) return;

    setState((prev) => ({
      ...prev,
      audienceSims: prev.audienceSims.map((s, j) => {
        if (i === j) {
          return {
            ...s,
            feedback,
          };
        }
        return s;
      }),
    }));
  };

  const handleRevise = async () => {
    const aoai = llmNode?.getClient();
    if (!aoai) return;

    // clear the scenes
    setState((prev) => ({ ...prev, scenes: [] }));

    // clear previous reactions and feedback
    setState((prev) => ({
      ...prev,
      audienceSims: prev.audienceSims.map((sim) => ({ ...sim, reactions: [], feedback: "" })),
    }));

    const response = await aoai.chat.completions.create({
      stream: true,
      messages: [
        system`Revise the following scenes of a commercial based on the critical feedback of the test audience. 
        
Current script:
${state.scenes
  .map(
    (scene, i) => `
Scene ${i + 1}
Title: ${scene.title}  
Description: ${scene.description}
`,
  )
  .join("\n")}

Respond with revised scenes in this JSON format
{
  scenes: {
    title: string; // title of the scene
    description: string; // description of the scene
  }[];
}
`,
        user`Overall feedback:

${state.audienceSims
  .filter((sim) => sim.feedback)
  .map((sim) => `${sim.name}: ${sim.feedback}`)
  .join("\n")}`,
      ],
      response_format: {
        type: "json_object",
      },
      model: "gpt-4o-mini",
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

  return (
    <div className="app-layout">
      <aside className="control-panel">
        <h2>Goal</h2>
        <textarea
          value={state.goal}
          onChange={(e) => setState((prev) => ({ ...prev, goal: e.target.value }))}
        ></textarea>

        <h2>Invite audience</h2>
        <input name="audienceCount" type="number" min={1} max={5} defaultValue={3} />
        <textarea
          value={state.targetAudience}
          onChange={(e) => setState((prev) => ({ ...prev, targetAudience: e.target.value }))}
        ></textarea>
        <button
          onClick={() =>
            handleInviteAudience(document.querySelector<HTMLInputElement>(`[name="audienceCount"]`)!.valueAsNumber)
          }
        >
          Invite
        </button>
        <div>
          {state.audienceSims.map((sim, i) => (
            <div key={i} className="audience-sim">
              <b>{sim.name}</b> <span>{sim.background}</span>
            </div>
          ))}
        </div>

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
          <button onClick={handleRevise}>Revise</button>
        </div>

        <div className="scene-list">
          {state.scenes.map((scene, i) => (
            <div key={i} className="scene-card">
              <b>{scene.title}</b>
              <p>{scene.description}</p>
              <button onClick={() => handleShowScene(i)}>Visualize</button>
              <button onClick={() => handleReact(i)}>Screen</button>
              {scene.image ? <img src={scene.image} alt={scene.title} /> : null}
              {state.audienceSims
                .filter((sim) => sim.reactions.at(i))
                .map((sim, j) => (
                  <div key={j} className="audience-sim">
                    <b>{sim.name}</b>: <span>{sim.reactions.at(i)!}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>

        <h2>Feedback</h2>
        {state.audienceSims.map((sim, i) => (
          <div key={i} className="audience-sim">
            <b>{sim.name}</b>
            <details>
              <span>{sim.background}</span>
              {sim.reactions.map((reaction, j) => (
                <div key={j} className="reaction">
                  <b>Scene {j + 1}</b>
                  <span>{reaction}</span>
                </div>
              ))}
            </details>
            <button onClick={() => handleGetFeedback(i)}>Hear feedback</button>
            <div>{sim.feedback}</div>
          </div>
        ))}
      </aside>
      <main className="main-layout">
        <div>
          <img src="https://placehold.co/1080x720?text=Screen" alt="screen" />
        </div>
        <div className="audience-layer">
          {state.audienceSims.map((sim, i) => (
            <Avartar key={i} alt={sim.name} title={`${sim.name}\n${sim.background}`} />
          ))}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
