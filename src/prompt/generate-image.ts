import { useCallback } from "react";
import { promptImprovementsMap, type AzureDalleNode } from "../lib/ai-bar/lib/elements/azure-dalle-node";
import type { AppState } from "../storyboard";

export interface UseGenerateImageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function useGenerateImage(props: UseGenerateImageProps) {
  const { state, setState } = props;

  const generateImage = useCallback(
    async (i: number, revise?: boolean) => {
      const azureDalleNode = document.querySelector<AzureDalleNode>("azure-dalle-node");
      if (!azureDalleNode) return;

      // show placeholder
      setState((prev) => ({
        ...prev,
        frames: prev.frames.map((scene, j) =>
          j === i
            ? {
                ...scene,
                image: `https://placehold.co/720?text=${encodeURIComponent(scene.title + "\nsketching...")}`,
              }
            : scene,
        ),
      }));

      // use cached revised prompt
      let finalPrompt = promptImprovementsMap.get(state.frames[i].visualSnapshot) ?? state.frames[i].visualSnapshot;
      if (revise) {
        if (finalPrompt) {
          setState((prev) => ({
            ...prev,
            frames: prev.frames.map((scene, j) => (j === i ? { ...scene, visualSnapshot: finalPrompt } : scene)),
          }));
        }
      }

      const img = await azureDalleNode.generateImage({
        prompt: finalPrompt,
        style: "vivid",
        revise,
      });

      setState((prev) => ({
        ...prev,
        frames: prev.frames.map((scene, j) => (j === i ? { ...scene, image: img.data.at(0)?.url } : scene)),
      }));
    },
    [state.frames],
  );

  return { generateImage };
}
