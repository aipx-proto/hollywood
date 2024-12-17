import { Subject, switchMap } from "rxjs";
import type { AzureSttNode } from "../lib/ai-bar/lib/elements/azure-stt-node";
import type { AzureTtsNode } from "../lib/ai-bar/lib/elements/azure-tts-node";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import type { AIBarEventDetail } from "../lib/ai-bar/lib/events";
import { system, user } from "../lib/message";
import type { AudienceSim } from "../storyboard";

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
  #focusedMember: AudienceSim | null = null;
  #interactionRequest$ = new Subject<{ focusedSim: AudienceSim | null; speech: string }>();
  #abortController = new AbortController();

  setGroupMembers(sims: AudienceSim[]) {
    this.#sims = sims;
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
      azureTts.queue(props.utterance).then(() => {
        that.#transcript = [...that.#transcript, { speaker: props.name, text: props.utterance }];
        console.log(`${props.name}: ${props.utterance}`);
      });
      return `${props.name} spoke: ${props.utterance}`;
    }

    this.#interactionRequest$
      .pipe(
        switchMap(async (req) => {
          const userSpeech = `${req.focusedSim ? `(asking ${req.focusedSim.name}) ` : ""}${req.speech}`;

          aoai?.beta.chat.completions.runTools(
            {
              messages: [
                system`You are simulating a commerical movie test screening event. The audience consists of the following people:
${this.#sims.map((sim) => `- ${sim.name}: ${sim.background}`).join("\n")}

${this.#transcript.length ? `Here is the transcript so far:\n${this.#transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")}` : ""}

Now, simulate a group interview between the audience members and the host. Speak as members of the audience turn by turn. If the question is unclear, pass it back to the host. 
Take turns naturally but do not exceed three turns. One sentence one speaker per turn.
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
}
