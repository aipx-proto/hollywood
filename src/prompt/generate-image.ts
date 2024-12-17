import { useCallback } from "react";
import type { AzureDalleNode } from "../lib/ai-bar/lib/elements/image-gen-node";
import type { AppState } from "../storyboard";

export interface UseGenerateImageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function useGenerateImage(props: UseGenerateImageProps) {
  const { state, setState } = props;

  const generateImage = useCallback(
    async (i: number) => {
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

      setState((prev) => ({
        ...prev,
        frames: prev.frames.map((scene, j) => (j === i ? { ...scene, image: img.data.at(0)?.url } : scene)),
      }));
    },
    [state.frames],
  );

  return { generateImage };
}
