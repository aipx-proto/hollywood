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
          j === i
            ? {
                ...scene,
                image: `https://placehold.co/1080?text=${encodeURIComponent(scene.title + "\nsketching...")}`,
              }
            : scene,
        ),
      }));

      const img = await azureDalleNode.generateImage({
        prompt:
          state.frames[i].visualSnapshot +
          ` A stylized illustration rendered in a manner reminiscent of a detailed comic book or graphic novel. The color palette is muted, employing earth tones with a sepia undertone, accented by teal highlights.  The lighting is dramatic, with a strong focus on the central figure, creating a chiaroscuro effect.  The style features heavy use of cross-hatching and stippling to create texture and depth, giving the image a slightly gritty, almost vintage feel.  The lines are bold and confident, with a high level of detail in the rendering of textures and surfaces. The overall aesthetic is dark, moody, and intense.`,
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
