import { concatMap, filter, Observable, Subject, Subscription } from "rxjs";
import type { AIBar, TextToSpeechProvider } from "../ai-bar";
import { CustomOutputStream } from "./lib/custom-output-stream";

export function defineAzureTtsNode(tagName = "azure-tts-node") {
  customElements.define(tagName, AzureTtsNode);
}

export class AzureTtsNode extends HTMLElement implements TextToSpeechProvider {
  private sentenceQueue = createSentenceQueue();
  private audioSink = new CustomOutputStream();
  private isStarted = false;
  private sub: Subscription | null = null;

  private finishCallbacks: Map<string, () => void> = new Map();

  connectedCallback() {
    this.setAttribute("provides", "tts");

    this.sub = this.sentenceQueue.sentenceQueue
      .pipe(
        filter((block) => !!block),
        concatMap(async (block) => {
          const connection = this.closest<AIBar>("ai-bar")?.getAzureConnection();
          if (!connection) throw new Error("Unable to get credentials from the closest <ai-bar>. Did you forget to provide them?");

          const result = await synthesizeSpeech({
            apiKey: connection.speechKey,
            region: connection.speechRegion,
            text: block,
            voice: this.getAttribute("voice") ?? undefined,
            rate: this.getAttribute("rate") ?? undefined,
          });

          return { text: block, audio: result };
        })
      )
      .subscribe((data) =>
        this.audioSink.appendBuffer(data.audio, {
          onPlayStart: () => {
            console.log(`[azure-tts:speaking] ${data.text}`);
          },
          onPlayEnd: () => {
            console.log(`[azure-tts:spoken] ${data.text}`);
            if (this.finishCallbacks.has(data.text)) {
              this.finishCallbacks.get(data.text)?.();
              this.finishCallbacks.delete(data.text);
            }
          },
        })
      );
  }

  disconnectedCallback() {
    this.sub?.unsubscribe();
  }

  startSpeaker(): void {
    this.audioSink.start();
  }

  async queue(text: string) {
    const deferred = Promise.withResolvers<void>();

    console.log(`[azure-tts:enqueue] ${text}`);
    if (!this.isStarted) {
      this.audioSink.start();
      this.isStarted = true;
    }

    this.finishCallbacks.set(text, deferred.resolve);
    this.sentenceQueue.enqueue(text);

    return deferred.promise;
  }

  clear(): void {
    this.audioSink.pause();
    this.isStarted = false;
    // this.audioSink.start();
  }
}

function createSentenceQueue() {
  const sentence$ = new Subject<string>();

  function enqueue(text: string) {
    if (text.trim()) {
      sentence$.next(text);
    }
  }

  return {
    sentenceQueue: sentence$ as Observable<string>,
    enqueue,
  };
}

interface InputParams {
  apiKey: string;
  text: string;
  region?: string; // default "eastus"
  voice?: string; // default "en-US-AndrewMultilingualNeural"
  rate?: string; // default 1.2
}

async function synthesizeSpeech({ apiKey, text, region, voice, rate }: InputParams): Promise<Uint8Array> {
  const ssml = `
    <speak version='1.0' xml:lang='en-US'>
      <voice xml:lang='en-US' name='${voice ?? "en-US-AndrewMultilingualNeural"}'>
        <prosody rate="${rate ?? 1.2}">
          ${text}
        </prosody>
      </voice>
    </speak>
  `;

  try {
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    // response.arrayBuffer().then((buffer) => audioSink.appendBuffer(new Uint8Array(buffer)));
    return response.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    throw new Error("Error synthesizing speech. Check the console for details.");
  }
}
