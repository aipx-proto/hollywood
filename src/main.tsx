import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import type { LlmNode } from "./lib/ai-bar/lib/elements/llm-node";
import { loadAIBar } from "./lib/ai-bar/loader";
import { useScreenwriter } from "./lib/screenwriter";

loadAIBar();

function App() {
  const { prompt, setPrompt, storyboards } = useScreenwriter();

  const handleGenerateStoryboards = async () => {
    const aoai = document.querySelector<LlmNode>("llm-node")!.getClient();

    const response = await aoai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o",
    });
  };

  return (
    <div className="app-layout">
      <div className="field">
        <label>
          <b>Prompt</b>
        </label>
        <textarea
          placeholder="15 seconds commercial for Seattle FIFA World Cup"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        ></textarea>
        <button onClick={handleGenerateStoryboards}>Generate</button>
      </div>
      <div className="story-board">
        <b>Storyboard</b>
        {storyboards.map((storyboard) => (
          <div key={storyboard.id} className="story-board-item">
            <img src={storyboard.image} alt={storyboard.description} />
            <p>{storyboard.description}</p>
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
