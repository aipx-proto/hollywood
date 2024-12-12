import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { narratives, type Narrative } from "./data/narratives";
import "./index.css";
import type { LlmNode } from "./lib/ai-bar/lib/elements/llm-node";
import { loadAIBar } from "./lib/ai-bar/loader";

const llmNode = document.querySelector<LlmNode>("llm-node");

loadAIBar();

export interface AppState {
  goal: string;
  narratives: Narrative[];
  story: string;
  characters: Character[];
  scenes: Scene[];
}

export interface Character {
  name: string;
  background: string;
}

export interface Scene {
  description: string;
}

function App() {
  const [state, setState] = useState<AppState>({
    goal: "Promote a coffee brand for diverse communities in Seattle",
    narratives: narratives.map((n, i) => ({ ...n, selected: i === 0 })),
    story: "",
    characters: [],
    scenes: [],
  });

  const handleGenerateStory = async () => {
    const client = await llmNode?.getClient();
    if (!client) return;

    const selectedNarrative = state.narratives.find((n) => n.selected);

    setState((prev) => ({ ...prev, story: "Generating story..." }));
    const response = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Help user write a story based on their goal and a narrative. Respond in this JSON format
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
          content: `Goal: ${state.goal}
Narrative: ${selectedNarrative?.name} - ${selectedNarrative?.description}
          `.trim(),
        },
      ],
      model: "gpt-4o-mini",
      response_format: {
        type: "json_object",
      },
    });

    const parsed = JSON.parse(response.choices[0].message.content ?? "{}");

    setState((prev) => ({
      ...prev,
      story: parsed.story,
      characters: (parsed.characters as any[]).map((c) => ({ name: c.concreteRole, background: c.abstractRole })),
    }));
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
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
