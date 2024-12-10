import { useState } from "react";

export interface Storyboard {
  id: number;
  description: string;
  image?: string;
}

export function useScreenwriter() {
  const [prompt, setPrompt] = useState("");
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);

  return {
    prompt,
    setPrompt,
    storyboards,
  };
}
