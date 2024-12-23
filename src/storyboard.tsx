import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Avartar, generateEmojiGroup, personas } from "./components/avatar-element";
import { generateMockStory } from "./data/mock-story";
import { narratives, type Narrative } from "./data/narratives";
import { techniques, type Technique } from "./data/techniques";
import type { AIBar } from "./lib/ai-bar/lib/ai-bar";
import { loadAIBar } from "./lib/ai-bar/loader";
import { useGenerateAudience } from "./prompt/generate-audience";
import { useGenerateImage } from "./prompt/generate-image";
import { useGenerateStory } from "./prompt/generate-story";
import { useGenerateStoryboardFrames } from "./prompt/generate-storyboard-frames";
import { GroupInterview } from "./prompt/group-interview";
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
  isGenerated?: boolean;
}

export interface AudienceSim {
  name: string;
  background: string;
  reactions: string[];
  feedback: string;
}

const aiBar = document.querySelector<AIBar>("ai-bar");

const groupInterview = new GroupInterview();

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

  const { generateAudience } = useGenerateAudience({ state, setState, patchState });
  const { generateStory } = useGenerateStory({ state, setState });
  const { generateStoryboardFrames } = useGenerateStoryboardFrames({ state, setState });
  const { generateImage } = useGenerateImage({ state, setState });

  // automatically generate image when a scene is added
  useEffect(() => {
    const newFrames = state.frames.map((frame, index) => ({ frame, index })).filter((item) => !item.frame.isGenerated);
    if (!newFrames.length) return;

    console.log(`[image-gen] ${newFrames.length} new frames detected`);

    // mark all as isGenerated
    setState((prev) => ({
      ...prev,
      frames: prev.frames.map((frame) => ({ ...frame, isGenerated: true })),
    }));

    newFrames.forEach((item) => {
      generateImage(item.index);
    });
  }, [state.frames]);

  // automatically generate emoji reactions when a scene is added

  // synchronize state with group interview
  useEffect(() => {
    groupInterview.setGroupMembers(state.audienceSims);
    groupInterview.setFocusedFrameIndex(state.frames.findIndex((s) => s.isShowing));
    groupInterview.setFrames(state.frames);
  }, [state]);

  const handleAvatarPress = (i: number | null) => {
    aiBar?.startRecording();
    groupInterview.setFocusedMember(i);
  };

  const handleAvatarRelease = () => {
    aiBar?.stopRecording();
  };

  // speak the story when activating a scene
  const activeFrame = useMemo(() => state.frames.find((scene) => scene.isShowing), [state.frames]);
  const narrateStory = (content: string) => {
    aiBar?.speak(content, { interrupt: true });
    groupInterview.getEmojiReactions(state.frames.findIndex((s) => s.isShowing));
  };

  const enterDebugMode = () => {
    patchState(generateMockStory());
    groupInterview.start();
  };

  return (
    <div className="app-layout" data-has-scenes={state.frames.length > 0}>
      <aside className="control-panel">
        <div>
          <button
            onClick={() =>
              generateEmojiGroup({
                targetElement: document.querySelector(`[data-debug-emoji]`) as HTMLElement,
                emojisPerSecond: 5,
                durationSeconds: 3,
                delaySeconds: 0.5,
              })
            }
          >
            Debug emoji
          </button>
          <button onClick={enterDebugMode}>Debug screening</button>
        </div>
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
            groupInterview.start();
            generateAudience(document.querySelector<HTMLInputElement>(`[name="audienceCount"]`)!.valueAsNumber);
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
          {activeFrame?.image ? (
            <img src={activeFrame!.image} alt={activeFrame?.visualSnapshot} title={activeFrame?.visualSnapshot} />
          ) : (
            <img src="https://placehold.co/720?text=Screen" alt="screen" />
          )}

          <div className="slide-control">
            {state.frames.map((scene, i) => (
              <button
                key={i}
                aria-pressed={scene.isShowing}
                onClick={() => {
                  setState((prev) => ({
                    ...prev,
                    frames: prev.frames.map((scene, j) => ({ ...scene, isShowing: i === j })),
                  }));
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {activeFrame ? (
            <div>
              <div className="story-card">
                <h2>{activeFrame?.title}</h2>
                <p>{activeFrame?.story}</p>
                <div>
                  <button onClick={() => narrateStory(activeFrame!.story)}>Listen</button>
                  <button
                    title="visualize"
                    onClick={() =>
                      generateImage(
                        state.frames.findIndex((s) => s.isShowing),
                        true,
                      )
                    }
                  >
                    Resketch
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
            <button
              key={i}
              data-debug-emoji
              data-name={sim.name}
              data-voice={personas.find((p) => p.name === sim.name)?.voiceId ?? ""}
              onMouseDown={() => handleAvatarPress(i)}
              onMouseUp={() => handleAvatarRelease()}
            >
              <Avartar alt={sim.name} title={`${sim.name}\n${sim.background}`} />
              <span className="name">{sim.name}</span>
            </button>
          ))}
          <button onMouseDown={() => handleAvatarPress(null)} onMouseUp={() => handleAvatarRelease()}>
            Room
          </button>
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
