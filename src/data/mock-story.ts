import type { AppState } from "../storyboard";
import { narratives } from "./narratives";
import { techniques } from "./techniques";

export function generateMockStory(): Partial<AppState> {
  return {
    goal: "Promote a coffee brand for diverse communities in Seattle",
    story:
      "A barista struggles to keep up with the demands of a bustling coffee shop while trying to maintain a positive attitude.",

    narratives: narratives.map((n, i) => ({ ...n, selected: i === 0 })),
    techniques: techniques.map((t, i) => ({ ...t, selected: i === 0 })),
    characters: [
      {
        realRole: "Barista",
        symbolicRole: "Hero",
        backstory:
          "The barista is a dedicated employee who loves their job but is struggling to keep up with the demands of the busy coffee shop.",
      },
      {
        realRole: "Manager",
        symbolicRole: "Mentor",
        backstory:
          "The manager is a seasoned professional who has been working at the coffee shop for many years and is known for their tough love approach.",
      },
      {
        realRole: "Customer",
        symbolicRole: "Trickster",
        backstory:
          "The customer is a regular who always seems to have a problem with their order and is known for being difficult to please.",
      },
    ],
    frames: [
      {
        title: "The Barista's Struggle",
        story:
          "The barista is struggling to keep up with the demands of the busy coffee shop while trying to maintain a positive attitude.",
        visualSnapshot: "A barista is rushing around the coffee shop, trying to keep up with the orders.",
        image: "https://placehold.co/720?text=The+Barista%27s+Struggle",
        isShowing: true,
      },
      {
        title: "The Manager's Advice",
        story:
          "The manager approaches the barista and gives them some tough love advice on how to handle the situation.",
        visualSnapshot: "The manager is standing behind the barista, giving them some tough love advice.",
        image: "https://placehold.co/720?text=The+Manager%27s+Advice",
      },
      {
        title: "The Customer's Complaint",
        story:
          "A customer approaches the barista and complains about their order, causing the barista to become frustrated.",
        visualSnapshot: "The customer is standing in front of the barista, complaining about their order.",
        image: "https://placehold.co/720?text=The+Customer%27s+Complaint",
      },
    ],
    acts: [
      {
        title: "The Barista's Struggle",
        description:
          "The barista is struggling to keep up with the demands of the busy coffee shop while trying to maintain a positive attitude.",
      },
      {
        title: "The Manager's Advice",
        description:
          "The manager approaches the barista and gives them some tough love advice on how to handle the situation.",
      },
      {
        title: "The Customer's Complaint",
        description:
          "A customer approaches the barista and complains about their order, causing the barista to become frustrated.",
      },
    ],
    targetAudience: "Outdoor activity enthusiasts who live in the Pacific Northwest",
    audienceSims: [
      {
        name: "John",
        background: "A regular customer who loves coffee and is always looking for new places to try.",
        reactions: [],
        feedback: "",
      },
      {
        name: "Jane",
        background:
          "A barista who has been working at the coffee shop for many years and is known for her positive attitude.",
        reactions: [],
        feedback: "",
      },
      {
        name: "Jim",
        background:
          "A manager who has been working at the coffee shop for many years and is known for her tough love approach.",
        reactions: [],
        feedback: "",
      },
    ],
  };
}
