import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { loadAIBar } from "./lib/ai-bar/loader";
import { useScreenwriter } from "./lib/screenwriter";

loadAIBar();

function App() {
  const { generateStory, prompt, setPrompt, storyboards } = useScreenwriter();

  const handleGenerateStoryboards = async () => {
    generateStory();
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
