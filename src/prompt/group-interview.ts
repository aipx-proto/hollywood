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
    azureTts.startSpeaker();

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
      azureTts.queue(props.utterance).then(() => {
        that.#transcript = [...that.#transcript, { speaker: props.name, text: props.utterance }];
        console.log(`${props.name}: ${props.utterance}`);
      });
    }

    this.#interactionRequest$
      .pipe(
        switchMap(async (req) => {
          const userSpeech = `(asking ${req.sim.name}) ${req.speech}`;

          aoai?.beta.chat.completions.runTools({
            messages: [
              system`You are simulating a commerical movie test screening event. The audience consists of the following people:
${this.#sims.map((sim) => `- ${sim.name}: ${sim.background}`).join("\n")}

${this.#transcript.length ? `Here is the transcript so far:\n${this.#transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")}` : ""}

Now, simulate a group interview between the audience members and the host. Speak as members of the audience. At the end of the turn, either pass it to the next speaker or stop when the conversation reaches is specifically address to one person or reaches a natural end. If the question is unclear, pass it back to the host. 
Keep it natural with up to three turns, one sentence one speaker each turn.
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
