import type React from "react";

export const allowedNames = [
  "Avery",
  "Leah",
  "Emery",
  "Jude",
  "Jessica",
  "Wyatt",
  "Katherine",
  "Nolan",
  "Kingston",
  "Sarah",
  "Ryan",
  "Brian",
  "Sawyer",
  "Andrea",
  "Amaya",
  "Sadie",
  "Liliana",
  "Jade",
  "Eliza",
  "Alexander",
] as const;

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: (string & {}) | ((typeof allowedNames)[number] & {});
}
export const Avartar: React.FC<AvatarProps> = (props) => {
  const { src, alt, ...rest } = props;

  if (!allowedNames.includes(alt as any)) {
    console.warn(`Avatar alt "${alt}" is not recognized`);
  }

  return <img src={`https://api.dicebear.com/9.x/micah/svg?seed=${props.alt}`} {...rest} />;
};
