import { LambdaCore } from "../core/LambdaCore.js";
import type { ILambdaProvider, LambdaError, LambdaMode, LambdaInvokeResponse, LambdaPinPolicy } from "../types.js";

export class LambdaInvoke extends HTMLElement {
  static wcBindable = LambdaCore.wcBindable;

  static get observedAttributes(): string[] {
    return ["function-name", "qualifier", "mode", "log-type", "client-context"];
  }

  #core: LambdaCore;

  constructor() {
    super();
    this.#core = new LambdaCore(this);
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    switch (name) {
      case "function-name":
        this.functionName = newValue ?? "";
        break;
      case "qualifier":
        this.qualifier = newValue;
        break;
      case "mode":
        if (newValue === "stream" || newValue === "buffered") {
          this.mode = newValue;
        }
        break;
      case "log-type":
        this.logType = newValue === "Tail" ? "Tail" : "None";
        break;
      case "client-context":
        this.clientContext = newValue;
        break;
    }
  }

  get functionName(): string { return this.#core.functionName; }
  set functionName(value: string) { this.#core.functionName = value; }

  get payload(): unknown { return this.#core.payload; }
  set payload(value: unknown) { this.#core.payload = value; }

  get qualifier(): string | null { return this.#core.qualifier; }
  set qualifier(value: string | null) { this.#core.qualifier = value; }

  get clientContext(): string | null { return this.#core.clientContext; }
  set clientContext(value: string | null) { this.#core.clientContext = value; }

  get logType(): "None" | "Tail" { return this.#core.logType; }
  set logType(value: "None" | "Tail") { this.#core.logType = value; }

  get mode(): LambdaMode { return this.#core.mode; }
  set mode(value: LambdaMode) {
    this.#core.mode = value;
    this.setAttribute("mode", value);
  }

  get invoking(): boolean { return this.#core.invoking; }
  get result(): unknown { return this.#core.result; }
  get error(): LambdaError | null { return this.#core.error; }
  get duration(): number | null { return this.#core.duration; }
  get requestId(): string | null { return this.#core.requestId; }
  get statusCode(): number | null { return this.#core.statusCode; }
  get functionError(): string | null { return this.#core.functionError; }
  get executedVersion(): string | null { return this.#core.executedVersion; }
  get logResult(): string | null { return this.#core.logResult; }
  get streaming(): boolean { return this.#core.streaming; }
  get chunks(): string[] { return this.#core.chunks; }
  get text(): string { return this.#core.text; }
  get done(): boolean { return this.#core.done; }
  get firstByteLatency(): number | null { return this.#core.firstByteLatency; }
  get streamError(): LambdaError | null { return this.#core.streamError; }
  get pinPolicy(): Readonly<LambdaPinPolicy> { return this.#core.pinPolicy; }

  async invoke(): Promise<LambdaInvokeResponse | undefined> {
    return this.#core.invoke();
  }

  setProvider(provider: ILambdaProvider | null): void {
    this.#core.setProvider(provider);
  }

  setPinPolicy(policy: LambdaPinPolicy | null): void {
    this.#core.setPinPolicy(policy);
  }

  abort(): void {
    this.#core.abort();
  }

  reset(): void {
    this.#core.reset();
  }

  get core(): LambdaCore {
    return this.#core;
  }
}