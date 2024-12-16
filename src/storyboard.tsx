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
import { useGenerateStory } from "./prompt/generate-story";
import { useGenerateStoryboardFrames } from "./prompt/generate-storyboard-frames";
import { useInviteAudience } from "./prompt/invite-audience";
import "./storyboard.css";

const llmNode = document.querySelector<LlmNode>("llm-node");

loadAIBar();

export interface AppState {
  goal: string;
  narratives: Narrative[];
  story: string;
  characters: Character[];
  frames: Frame[];
  acts: Act[];
  techniques: Technique[];
  targetAudience: string;
  audienceSims: AudienceSim[];
}

export interface Character {
  realRole: string;
  symbolicRole: string;
  backstory: string;
}

export interface Act {
  title: string;
  description: string;
  isActive?: boolean;
}

export interface Frame {
  title: string;
  story: string;
  visualSnapshot: string;
  image?: string;
  isShowing?: boolean;
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
    frames: [],
    acts: [],
    techniques: techniques,
    targetAudience: "Outdoor activity enthusiasts who live in the Pacific Northwest",
    audienceSims: [],
  });

  const patchState = (patch: Partial<AppState>) => setState((p) => ({ ...p, ...patch }));

  const { inviteAudience } = useInviteAudience({ state, setState, patchState });
  const { generateStory } = useGenerateStory({ state, setState });
  const { generateStoryboardFrames } = useGenerateStoryboardFrames({ state, setState });

  const handleVisualize = async (i: number) => {
    const azureDalleNode = document.querySelector<AzureDalleNode>("azure-dalle-node");
    if (!azureDalleNode) return;

    // show placeholder
    setState((prev) => ({
      ...prev,
      frames: prev.frames.map((scene, j) =>
        j === i ? { ...scene, image: "https://placehold.co/1080?text=Sketching..." } : scene,
      ),
    }));

    const img = await azureDalleNode.generateImage({
      prompt:
        state.frames[i].visualSnapshot +
        ` Sketch in graphic novel illustration style, two-tone cross-hatch shading, well-defined outlines. Use large color blocks of earth-tone color.`,
      style: "vivid",
    });

    const altPrompt = ` Sketch in architecture drawing style, two-tone hatch shading, well-defined outlines. Use large color blocks of earth-tone color.`;

    setState((prev) => ({
      ...prev,
      frames: prev.frames.map((scene, j) => (j === i ? { ...scene, image: img.data.at(0)?.url } : scene)),
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
    (reaction, j) => `Scene ${j + 1}: ${state.frames[j].story}{
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
    setState((prev) => ({ ...prev, frames: [] }));

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
${state.frames
  .map(
    (scene, i) => `
Scene ${i + 1}
Title: ${scene.title}  
Description: ${scene.story}
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
                frames: [...prev.frames, v.value as any],
              };
            });
          }
        }),
      )
      .subscribe();
  };

  return (
    <div className="app-layout" data-has-scenes={state.frames.length > 0}>
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
            inviteAudience(document.querySelector<HTMLInputElement>(`[name="audienceCount"]`)!.valueAsNumber)
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
          <button onClick={generateStory}>Generate</button>
        </div>
        <textarea
          value={state.story}
          onChange={(e) => setState((prev) => ({ ...prev, story: e.target.value }))}
        ></textarea>

        {state.characters.length > 0 ? (
          <div className="character-grid">
            {state.characters.map((c) => (
              <div className="character-card" key={c.realRole}>
                <b>{c.symbolicRole}</b>
                <span>{c.realRole}</span>
              </div>
            ))}
          </div>
        ) : null}

        {state.acts.map((act, i) => (
          <div key={i}>
            <b>
              Act {i + 1} - {act.title}
            </b>
            <p>{act.description}</p>
          </div>
        ))}

        <h2>Cinematography</h2>
        <div>
          <button onClick={generateStoryboardFrames}>Generate</button>
          <button onClick={handleRevise}>Revise</button>
        </div>

        <div className="scene-list">
          {state.frames.map((scene, i) => (
            <div key={i} className="scene-card">
              <b>{scene.title}</b>
              <p>{scene.story}</p>
              <button onClick={() => handleVisualize(i)}>Visualize</button>
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
        <div className="screens">
          {state.frames.find((scene) => scene.isShowing)?.image ? (
            <img src={state.frames.find((scene) => scene.isShowing)!.image} alt="screen" />
          ) : (
            <img src="https://placehold.co/720?text=Screen" alt="screen" />
          )}
          <div>
            {state.frames.map((scene, i) => (
              <button
                key={i}
                aria-pressed={scene.isShowing}
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    frames: prev.frames.map((scene, j) => ({ ...scene, isShowing: i === j })),
                  }))
                }
              >
                {i}
              </button>
            ))}
          </div>
          {state.frames.find((scene) => scene.isShowing) ? (
            <div>
              <h2>{state.frames.find((scene) => scene.isShowing)?.title}</h2>
              <p>{state.frames.find((scene) => scene.isShowing)?.story}</p>
              <p>{state.frames.find((scene) => scene.isShowing)?.visualSnapshot}</p>
              <button title="visualize" onClick={() => handleVisualize(state.frames.findIndex((s) => s.isShowing))}>
                Visualize
              </button>
            </div>
          ) : null}
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
