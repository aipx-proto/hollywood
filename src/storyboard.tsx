import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Avartar } from "./components/avatar-element";
import { narratives, type Narrative } from "./data/narratives";
import { techniques, type Technique } from "./data/techniques";
import { loadAIBar } from "./lib/ai-bar/loader";
import { useGenerateImage } from "./prompt/generate-image";
import { useGenerateReaction } from "./prompt/generate-reaction";
import { useGenerateStory } from "./prompt/generate-story";
import { useGenerateStoryboardFrames } from "./prompt/generate-storyboard-frames";
import { useInviteAudience } from "./prompt/invite-audience";
import "./storyboard.css";

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
  const { generateImage } = useGenerateImage({ state, setState });
  const { generateReaction } = useGenerateReaction({ state, setState });

  return (
    <div className="app-layout" data-has-scenes={state.frames.length > 0}>
      <aside className="control-panel">
        <h2>Goal</h2>
        <textarea
          value={state.goal}
          onChange={(e) => setState((prev) => ({ ...prev, goal: e.target.value }))}
        ></textarea>

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

        <h2>Premiere</h2>
        <label>Audience size</label>
        <input name="audienceCount" type="number" min={1} max={5} defaultValue={3} />
        <label>Audience description</label>
        <textarea
          value={state.targetAudience}
          onChange={(e) => setState((prev) => ({ ...prev, targetAudience: e.target.value }))}
        ></textarea>
        <button
          onClick={() => {
            inviteAudience(document.querySelector<HTMLInputElement>(`[name="audienceCount"]`)!.valueAsNumber);
            generateStoryboardFrames();
          }}
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
      </aside>
      <main className="main-layout">
        <div className="screens">
          {state.frames.find((scene) => scene.isShowing)?.image ? (
            <img
              src={state.frames.find((scene) => scene.isShowing)!.image}
              alt={state.frames.find((scene) => scene.isShowing)?.visualSnapshot}
              title={state.frames.find((scene) => scene.isShowing)?.visualSnapshot}
            />
          ) : (
            <img src="https://placehold.co/720?text=Screen" alt="screen" />
          )}

          <div className="slide-control">
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
                {i + 1}
              </button>
            ))}
          </div>
          {state.frames.find((scene) => scene.isShowing) ? (
            <div>
              <div className="story-card">
                <h2>{state.frames.find((scene) => scene.isShowing)?.title}</h2>
                <p>{state.frames.find((scene) => scene.isShowing)?.story}</p>
                <div>
                  <button title="visualize" onClick={() => generateImage(state.frames.findIndex((s) => s.isShowing))}>
                    Visualize
                  </button>
                  <button onClick={() => generateReaction(state.frames.findIndex((s) => s.isShowing))}>
                    Get reactions
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {state.audienceSims
            .map((sim) => sim.reactions.at(state.frames.findIndex((s) => s.isShowing)))
            .filter(Boolean)
            .map((reaction, i) => (
              <div key={i} className="audience-sim">
                <b>{state.audienceSims[i].name}</b>: <span>{reaction}</span>
              </div>
            ))}
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
