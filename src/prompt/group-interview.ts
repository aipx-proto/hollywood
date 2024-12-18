import { Subject, switchMap } from "rxjs";
import { generateEmojiGroup, personas } from "../components/avatar-element";
import type { AzureSttNode } from "../lib/ai-bar/lib/elements/azure-stt-node";
import type { AzureTtsNode, StateChangeEventDetail } from "../lib/ai-bar/lib/elements/azure-tts-node";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import type { AIBarEventDetail } from "../lib/ai-bar/lib/events";
import { system, user } from "../lib/message";
import type { AudienceSim, Frame } from "../storyboard";

const azureStt = document.querySelector<AzureSttNode>("azure-stt-node")!;
const azureTts = document.querySelector<AzureTtsNode>("azure-tts-node")!;
const llmNode = document.querySelector<LlmNode>("llm-node");

interface TranscriptEntry {
  speaker: string;
  text: string;
}

export class GroupInterview {
  #transcript: TranscriptEntry[] = [];
  #sims: AudienceSim[] = [];
  #frames: Frame[] = [];
  #focusedMember: AudienceSim | null = null;
  #interactionRequest$ = new Subject<{ focusedSim: AudienceSim | null; speech: string }>();
  #abortController = new AbortController();
  #framesShownWithImage = new Set<number>();

  #emojiReactionRequest$ = new Subject<{ focusedFrame: Frame }>();

  setGroupMembers(sims: AudienceSim[]) {
    this.#sims = sims;
  }

  setFocusedFrameIndex(index: number | null) {
    if (index === null || index < 0) {
      return;
    }

    const activeFrame = this.#frames.at(index);
    if (!activeFrame) throw new Error(`No frame found at index: ${index}`);

    if (!this.#framesShownWithImage.has(index)) {
      this.#framesShownWithImage.add(index);
      this.#transcript = [
        ...this.#transcript,
        { speaker: "host", text: `(showing scene ${index + 1}: ${activeFrame.visualSnapshot}) ${activeFrame.story}` },
      ];
    }
  }

  getEmojiReactions(index: number) {
    const activeFrame = this.#frames.at(index);
    if (!activeFrame) throw new Error(`No frame found at index: ${index}`);
    this.#emojiReactionRequest$.next({ focusedFrame: activeFrame });
  }

  setFrames(frames: Frame[]) {
    this.#frames = frames;
  }

  setFocusedMember(index: number | null) {
    if (index === null) {
      this.#focusedMember = null;
    } else {
      this.#focusedMember = this.#sims.at(index) ?? null;
      if (!this.#focusedMember) {
        console.warn(`No member found at index: ${index}`);
      }
    }
  }

  start() {
    azureStt.startMicrophone();
    azureTts.startSpeaker();

    azureTts.addEventListener("statechange", (event) => {
      const { voice, isOn: state } = (event as CustomEvent<StateChangeEventDetail>).detail;
      if (!voice) {
        this.#updateSpeakerStatus("", false);
      } else {
        this.#updateSpeakerStatus(voice, state);
      }
    });

    // intercept speech event
    azureStt.addEventListener("event", (event) => {
      const typedEvent = event as CustomEvent<AIBarEventDetail>;
      if (!typedEvent.detail.recognized) return;
      typedEvent.stopPropagation();

      if (!typedEvent.detail.recognized.text) {
        // TODO just interrupt
        azureTts.clear();
        this.#abortController.abort();
        this.#abortController = new AbortController();
        this.#updateSpeakerStatus("", false);
      } else {
        const recognizedText = typedEvent.detail.recognized.text;
        this.#interactionRequest$.next({
          focusedSim: this.#focusedMember,
          speech: recognizedText,
        });
      }
    });

    const aoai = llmNode?.getClient();

    const that = this;

    function speakAs(props: { name: string; utterance: string }) {
      azureTts
        .queue(props.utterance, {
          voice: personas.find((p) => p.name === props.name)?.voiceId,
        })
        .then(() => {
          that.#transcript = [...that.#transcript, { speaker: props.name, text: props.utterance }];
          console.log(`${props.name}: ${props.utterance}`);
        });
      return `${props.name} spoke: ${props.utterance}`;
    }

    function reactWithEmoji(props: { name: string; emoji: string; intensity: number }) {
      generateEmojiGroup({
        targetElement: document.querySelector<HTMLElement>(`[data-voice][data-name="${props.name}"]`)!,
        emojisPerSecond: props.intensity * 1,
        durationSeconds: 2 + Math.random() * 3,
        delaySeconds: Math.random() * 3,
        emoji: props.emoji,
      });
    }

    this.#emojiReactionRequest$
      .pipe(
        switchMap(async (req) => {
          aoai?.beta.chat.completions.runTools({
            messages: [
              system`You are simulating a advertising commerical test screening event. The audience consists of the following people:
${this.#sims
  .toSorted(() => Math.random() - 0.5)
  .map((sim) => `- ${sim.name}: ${sim.background}`)
  .join("\n")}

${this.#transcript.length ? `Here is the transcript so far:\n${this.#transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")}` : ""}

Now, simulate how each audience member reacts to the latest scene with emojis.
Use the reactWithEmoji tool to react as each member. Choose the best emoji to express character's feeling. Intensity should be on a scale of 1-5.
Prefer face emojis over objects or scenes.
`,
              user`
Please simulate the reactions to the current scene: ${req.focusedFrame.story}
`,
            ],
            model: "gpt-4o",
            tools: [
              {
                type: "function",
                function: {
                  function: reactWithEmoji,
                  description: "React with an emoji",
                  parse: JSON.parse,
                  parameters: {
                    type: "object",
                    required: ["name", "emoji", "intensity"],
                    properties: {
                      name: {
                        type: "string",
                        description: "Name of the character",
                      },
                      emoji: {
                        type: "string",
                        description: "A single Emoji to react with",
                      },
                      intensity: {
                        type: "number",
                        description: "Intensity of the reaction, 1 to 5",
                      },
                    },
                  },
                },
              },
            ],
          });
        }),
      )
      .subscribe();

    this.#interactionRequest$
      .pipe(
        switchMap(async (req) => {
          const userSpeech = `${req.focusedSim ? `(asking ${req.focusedSim.name}) ` : ""}${req.speech}`;

          aoai?.beta.chat.completions.runTools(
            {
              messages: [
                system`You are simulating a advertising commerical test screening event. The audience consists of the following people:
${this.#sims.map((sim) => `- ${sim.name}: ${sim.background}`).join("\n")}

${this.#transcript.length ? `Here is the transcript so far:\n${this.#transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")}` : ""}

Now, simulate a group interview between the audience members and the host. Speak as members of the audience turn by turn. If the question is unclear, pass it back to the host. 
Take turns naturally but do not exceed three turns. One sentence one speaker per turn.
You MUST only use the speakAs tool to respond. In the end, do not respond with additional content.
              `,
                user`${userSpeech}`,
              ],
              model: "gpt-4o",
              tools: [
                {
                  type: "function",
                  function: {
                    function: speakAs,
                    description: "Speak as one of the characters",
                    parse: JSON.parse,
                    parameters: {
                      type: "object",
                      required: ["name", "utterance"],
                      properties: {
                        name: {
                          type: "string",
                          description: "Name of the character",
                        },
                        utterance: {
                          type: "string",
                          description: "Utterance by the character",
                        },
                      },
                    },
                  },
                },
              ],
            },
            {
              signal: this.#abortController.signal,
            },
          );

          this.#transcript = [...this.#transcript, { speaker: `host`, text: userSpeech }];
        }),
      )
      .subscribe();
  }

  #updateSpeakerStatus(name: string, isOn: boolean) {
    document.querySelectorAll(`[data-voice]`).forEach((el) => {
      el.toggleAttribute("data-speaking", isOn ? el.getAttribute("data-voice") === name : false);
    });
  }
}
