import { getConfig } from "../config.js";
import { raiseError } from "../raiseError.js";
import type { LambdaError } from "../types.js";
import type { LambdaInvoke } from "./LambdaInvoke.js";

const HTMLElementBase = (globalThis.HTMLElement ?? class extends EventTarget {}) as typeof HTMLElement;

const parentEvents = [
  "lambda-invoke:streaming-changed",
  "lambda-invoke:chunks-changed",
  "lambda-invoke:text-changed",
  "lambda-invoke:done-changed",
  "lambda-invoke:first-byte-latency-changed",
  "lambda-invoke:stream-error",
] as const;

export class LambdaStream extends HTMLElementBase {
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
  #syncQueued = false;
  #boundSync = () => this.#queueSyncFromParent();

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

  #queueSyncFromParent(): void {
    if (this.#syncQueued) {
      return;
    }

    this.#syncQueued = true;
    queueMicrotask(() => {
      this.#syncQueued = false;
      this.#syncFromParent();
    });
  }

  #setStreaming(value: boolean): void {
    if (this.#streaming === value) {
      return;
    }

    this.#streaming = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:streaming-changed", { detail: value, bubbles: true }));
  }

  #setChunks(value: string[]): void {
    if (stringArraysEqual(this.#chunks, value)) {
      return;
    }

    this.#chunks = [...value];
    this.dispatchEvent(new CustomEvent("lambda-stream:chunks-changed", { detail: this.chunks, bubbles: true }));
  }

  #setText(value: string): void {
    if (this.#text === value) {
      return;
    }

    this.#text = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:text-changed", { detail: value, bubbles: true }));
  }

  #setDone(value: boolean): void {
    if (this.#done === value) {
      return;
    }

    this.#done = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:done-changed", { detail: value, bubbles: true }));
  }

  #setFirstByteLatency(value: number | null): void {
    if (this.#firstByteLatency === value) {
      return;
    }

    this.#firstByteLatency = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:first-byte-latency-changed", { detail: value, bubbles: true }));
  }

  #setStreamError(value: LambdaError | null): void {
    if (this.#streamError === value) {
      return;
    }

    this.#streamError = value;
    this.dispatchEvent(new CustomEvent("lambda-stream:error", { detail: value, bubbles: true }));
  }
}

function stringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}