import { Subject, switchMap } from "rxjs";
import type { AzureSttNode } from "../lib/ai-bar/lib/elements/azure-stt-node";
import type { LlmNode } from "../lib/ai-bar/lib/elements/llm-node";
import type { AIBarEventDetail } from "../lib/ai-bar/lib/events";
import { system, user } from "../lib/message";
import type { AudienceSim } from "../storyboard";

const azureStt = document.querySelector<AzureSttNode>("azure-stt-node")!;
const llmNode = document.querySelector<LlmNode>("llm-node");

interface TranscriptEntry {
  speaker: string;
  text: string;
}

export class GroupInterview {
  #transcript: TranscriptEntry[] = [];
  #sims: AudienceSim[] = [];
  #focusedMember: AudienceSim | null = null;
  #interactionRequest$ = new Subject<{ sim: AudienceSim; speech: string }>();

  setGroupMembers(sims: AudienceSim[]) {
    this.#sims = sims;
  }

  setFocusedMember(index: number) {
    this.#focusedMember = this.#sims.at(index) ?? null;
    if (!this.#focusedMember) {
      console.warn(`No member found at index: ${index}`);
    }
  }

  start() {
    azureStt.startMicrophone();

    // intercept speech event
    azureStt.addEventListener("event", (event) => {
      const typedEvent = event as CustomEvent<AIBarEventDetail>;
      if (!typedEvent.detail.recognized) return;
      typedEvent.stopPropagation();

      if (!typedEvent.detail.recognized.text) {
        // TODO just interrupt
      } else {
        const recognizedText = typedEvent.detail.recognized.text;
        console.log(recognizedText);
        if (!this.#focusedMember) throw new Error("Focused member is not set");

        console.log(this.#transcript);
        this.#interactionRequest$.next({
          sim: this.#focusedMember!,
          speech: recognizedText,
        });
      }
    });

    const aoai = llmNode?.getClient();

    const that = this;

    function speakAs(props: { name: string; utterance: string }) {
      console.log("speaking as", props);
      that.#transcript = [...that.#transcript, { speaker: props.name, text: props.utterance }];
    }

    this.#interactionRequest$
      .pipe(
        switchMap(async (req) => {
          const userSpeech = `(asking ${req.sim.name}) ${req.speech}`;

          aoai?.beta.chat.completions.runTools({
            messages: [
              system`You are simulating a commerical movie test screening event. The audience consists of the following people:
${this.#sims.map((sim) => `- ${sim.name}: ${sim.background}`).join("\n")}

${this.#transcript.length ? `Here is the transcript so far:\n${this.#transcript.map((t) => `- ${t.speaker}: ${t.text}`).join("\n")}` : ""}

Now, simulate a group interview between the audience members and the host. You can speak as a member of the audience. Stop when the conversation reaches a natural end or is passed back to the host. Do not exceed 3 turns.
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
          });

          this.#transcript = [...this.#transcript, { speaker: `host`, text: userSpeech }];
        }),
      )
      .subscribe();
  }
}
