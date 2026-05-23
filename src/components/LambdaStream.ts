import { getConfig } from "../config.js";
import { raiseError } from "../raiseError.js";
import type { LambdaError } from "../types.js";
import type { LambdaInvoke } from "./LambdaInvoke.js";

const parentEvents = [
  "lambda-invoke:streaming-changed",
  "lambda-invoke:chunks-changed",
  "lambda-invoke:text-changed",
  "lambda-invoke:done-changed",
  "lambda-invoke:first-byte-latency-changed",
  "lambda-invoke:stream-error",
] as const;

export class LambdaStream extends HTMLElement {
  static wcBindable = {
    protocol: "wc-bindable",
    version: 1,
    properties: [
      { name: "streaming", event: "lambda-stream:streaming-changed" },
      { name: "chunks", event: "lambda-stream:chunks-changed" },
      { name: "text", event: "lambda-stream:text-changed" },
      { name: "done", event: "lambda-stream:done-changed" },
      { name: "firstByteLatency", event: "lambda-stream:first-byte-latency-changed" },
      { name: "streamError", event: "lambda-stream:error" },
    ],
  } as const;

  #parent: LambdaInvoke | null = null;
  #streaming = false;
  #chunks: string[] = [];
  #text = "";
  #done = false;
  #firstByteLatency: number | null = null;
  #streamError: LambdaError | null = null;
  #boundSync = () => this.#syncFromParent();

  connectedCallback(): void {
    this.#attachToParent();
  }

  disconnectedCallback(): void {
    this.#detachFromParent();
  }

  get streaming(): boolean { return this.#streaming; }
  get chunks(): string[] { return [...this.#chunks]; }
  get text(): string { return this.#text; }
  get done(): boolean { return this.#done; }
  get firstByteLatency(): number | null { return this.#firstByteLatency; }
  get streamError(): LambdaError | null { return this.#streamError; }

  #attachToParent(): void {
    this.#detachFromParent();

    const tagName = getConfig().tagNames.lambdaInvoke;
    const candidate = this.closest(tagName);

    if (!(candidate instanceof HTMLElement)) {
      this.#setStreamError(raiseError(this, "lambda-stream:error", new Error("lambda-stream requires a parent lambda-invoke"), "LAMBDA_PARENT_REQUIRED"));
      return;
    }

    this.#parent = candidate as LambdaInvoke;

    for (const eventName of parentEvents) {
      this.#parent.addEventListener(eventName, this.#boundSync);
    }

    this.#syncFromParent();
  }

  #detachFromParent(): void {
    if (!this.#parent) {
      return;
    }

    for (const eventName of parentEvents) {
      this.#parent.removeEventListener(eventName, this.#boundSync);
    }

    this.#parent = null;
  }

  #syncFromParent(): void {
    if (!this.#parent) {
      return;
    }

    this.#setStreaming(this.#parent.streaming);
    this.#setChunks(this.#parent.chunks);
    this.#setText(this.#parent.text);
    this.#setDone(this.#parent.done);
    this.#setFirstByteLatency(this.#parent.firstByteLatency);
    this.#setStreamError(this.#parent.streamError);
  }

  #setStreaming(value: boolean): void {
    this.#streaming = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:streaming-changed", { detail: value, bubbles: true }));
  }

  #setChunks(value: string[]): void {
    this.#chunks = [...value];
    this.dispatchEvent(new CustomEvent("lambda-stream:chunks-changed", { detail: this.chunks, bubbles: true }));
  }

  #setText(value: string): void {
    this.#text = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:text-changed", { detail: value, bubbles: true }));
  }

  #setDone(value: boolean): void {
    this.#done = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:done-changed", { detail: value, bubbles: true }));
  }

  #setFirstByteLatency(value: number | null): void {
    this.#firstByteLatency = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:first-byte-latency-changed", { detail: value, bubbles: true }));
  }

  #setStreamError(value: LambdaError | null): void {
    this.#streamError = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:error", { detail: value, bubbles: true }));
  }
}