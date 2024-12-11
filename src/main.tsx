import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { loadAIBar } from "./lib/ai-bar/loader";
import { useScreenwriter } from "./lib/screenwriter";

loadAIBar();

function App() {
  const { generateStory, generateImage, prompt, setPrompt, storyboards } = useScreenwriter();

  const handleGenerateStoryboards = async () => {
    generateStory();
  };

  const handleVisualize = async (id: number) => {
    generateImage(id);
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
            {storyboard.image ? <img className="preview" src={storyboard.image} /> : null}
            <button onClick={() => handleVisualize(storyboard.id)}>Visualize</button>
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
