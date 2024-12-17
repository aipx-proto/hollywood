import type React from "react";

export const personas = [
  { name: "Aidan", gender: "Male", voiceId: "en-US-AndrewMultilingualNeural" },
  { name: "Avery", gender: "Male", voiceId: "en-US-BrianMultilingualNeural" },
  { name: "Christopher", gender: "Male", voiceId: "en-US-GuyNeural" },
  { name: "Emery", gender: "Male", voiceId: "en-US-DavisNeural" },
  { name: "Jack", gender: "Male", voiceId: "en-US-BrandonNeural" },
  { name: "Oliver", gender: "Male", voiceId: "en-US-JasonNeural" },
  { name: "Sawyer", gender: "Male", voiceId: "en-US-TonyNeural " },
  { name: "Leah", gender: "Female", voiceId: "en-US-AvaMultilingualNeural" },
  { name: "Mackenzie", gender: "Female", voiceId: "en-US-EmmaMultilingualNeural" },
  { name: "Riley", gender: "Female", voiceId: "en-US-JennyNeural" },
  { name: "Sara", gender: "Female", voiceId: "en-US-AriaNeural" },
  { name: "Sophia", gender: "Female", voiceId: "en-US-JaneNeural" },
  { name: "Valentina", gender: "Female", voiceId: "en-US-SaraNeural" },
  { name: "Vivian", gender: "Female", voiceId: "en-US-NancyNeural " },
] as const;

export const allowedNames = personas.map((persona) => persona.name);

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: (string & {}) | ((typeof allowedNames)[number] & {});
}
export const Avartar: React.FC<AvatarProps> = (props) => {
  const { src, alt, ...rest } = props;

  if (!allowedNames.includes(alt as any)) {
    console.warn(`Avatar alt "${alt}" is not recognized`);
  }

  return <img src={`https://api.dicebear.com/9.x/micah/svg?seed=${props.alt}`} draggable={false} {...rest} />;
};
