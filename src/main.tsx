import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { loadAIBar } from "./lib/ai-bar/loader";

loadAIBar();

function App() {
  return <>hello react</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
