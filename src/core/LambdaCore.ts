import { toLambdaError } from "../raiseError.js";
import { clonePinPolicy, resolveFunctionName, resolveQualifier } from "../pinPolicy.js";
import type {
  ILambdaProvider,
  LambdaError,
  LambdaInvokeOptions,
  LambdaInvokeResponse,
  LambdaMode,
  LambdaPinPolicy,
  LambdaStreamChunk,
} from "../types.js";

const parentProperties = [
  { name: "invoking", event: "lambda-invoke:invoking-changed" },
  { name: "result", event: "lambda-invoke:result-changed" },
  { name: "error", event: "lambda-invoke:error" },
  { name: "duration", event: "lambda-invoke:duration-changed" },
  { name: "requestId", event: "lambda-invoke:request-id-changed" },
  { name: "statusCode", event: "lambda-invoke:status-code-changed" },
  { name: "functionError", event: "lambda-invoke:function-error-changed" },
  { name: "executedVersion", event: "lambda-invoke:executed-version-changed" },
  { name: "logResult", event: "lambda-invoke:log-result-changed" },
  { name: "mode", event: "lambda-invoke:mode-changed" },
  { name: "streaming", event: "lambda-invoke:streaming-changed" },
  { name: "chunks", event: "lambda-invoke:chunks-changed" },
  { name: "text", event: "lambda-invoke:text-changed" },
  { name: "done", event: "lambda-invoke:done-changed" },
  { name: "firstByteLatency", event: "lambda-invoke:first-byte-latency-changed" },
  { name: "streamError", event: "lambda-invoke:stream-error" }
] as const;

export class LambdaCore extends EventTarget {
  static wcBindable = {
    protocol: "wc-bindable",
    version: 1,
    properties: parentProperties,
    inputs: [
      { name: "functionName" },
      { name: "payload" },
      { name: "qualifier" },
      { name: "clientContext" },
      { name: "logType" },
      { name: "mode" },
    ],
    commands: [
      { name: "invoke", async: true },
      { name: "abort" },
      { name: "reset" },
    ],
  } as const;

  #target: EventTarget;
  #provider: ILambdaProvider | null;
  #pinPolicy: LambdaPinPolicy = {};
  #functionName = "";
  #payload: unknown = null;
  #qualifier: string | null = null;
  #clientContext: string | null = null;
  #logType: "None" | "Tail" = "None";
  #mode: LambdaMode = "buffered";
  #invoking = false;
  #result: unknown = null;
  #error: LambdaError | null = null;
  #duration: number | null = null;
  #requestId: string | null = null;
  #statusCode: number | null = null;
  #functionError: string | null = null;
  #executedVersion: string | null = null;
  #logResult: string | null = null;
  #streaming = false;
  #chunks: string[] = [];
  #text = "";
  #done = false;
  #firstByteLatency: number | null = null;
  #streamError: LambdaError | null = null;
  #activeInvocationId = 0;
  #activeController: AbortController | null = null;

  constructor(target?: EventTarget, provider?: ILambdaProvider | null) {
    super();
    this.#target = target ?? this;
    this.#provider = provider ?? null;
  }

  get functionName(): string { return this.#functionName; }
  set functionName(value: string) { this.#trySetFunctionName(value); }

  get payload(): unknown { return this.#payload; }
  set payload(value: unknown) { this.#payload = value; }

  get qualifier(): string | null { return this.#qualifier; }
  set qualifier(value: string | null) { this.#trySetQualifier(value); }

  get clientContext(): string | null { return this.#clientContext; }
  set clientContext(value: string | null) { this.#clientContext = value; }

  get logType(): "None" | "Tail" { return this.#logType; }
  set logType(value: "None" | "Tail") { this.#logType = value; }

  get mode(): LambdaMode { return this.#mode; }
  set mode(value: LambdaMode) {
    this.#mode = value;
    this.#dispatch("lambda-invoke:mode-changed", value);
  }

  get invoking(): boolean { return this.#invoking; }
  get result(): unknown { return this.#result; }
  get error(): LambdaError | null { return this.#error; }
  get duration(): number | null { return this.#duration; }
  get requestId(): string | null { return this.#requestId; }
  get statusCode(): number | null { return this.#statusCode; }
  get functionError(): string | null { return this.#functionError; }
  get executedVersion(): string | null { return this.#executedVersion; }
  get logResult(): string | null { return this.#logResult; }
  get streaming(): boolean { return this.#streaming; }
  get chunks(): string[] { return [...this.#chunks]; }
  get text(): string { return this.#text; }
  get done(): boolean { return this.#done; }
  get firstByteLatency(): number | null { return this.#firstByteLatency; }
  get streamError(): LambdaError | null { return this.#streamError; }
  get pinPolicy(): Readonly<LambdaPinPolicy> { return Object.freeze(clonePinPolicy(this.#pinPolicy)); }

  get hasProvider(): boolean { return this.#provider !== null; }

  setProvider(provider: ILambdaProvider | null): void {
    this.#provider = provider;
  }

  setPinPolicy(policy: LambdaPinPolicy | null): void {
    this.#pinPolicy = clonePinPolicy(policy);

    if (this.#functionName || this.#pinPolicy.pinnedFunctionName) {
      this.#functionName = resolveFunctionName(this.#functionName, this.#pinPolicy);
    }

    this.#qualifier = resolveQualifier(this.#qualifier, this.#pinPolicy);
  }

  #trySetFunctionName(value: string): boolean {
    try {
      this.#functionName = resolveFunctionName(value, this.#pinPolicy);
      return true;
    } catch (error) {
      this.#setError(toLambdaError(error, "LAMBDA_POLICY_DENIED"));
      return false;
    }
  }

  #trySetQualifier(value: string | null): boolean {
    try {
      this.#qualifier = resolveQualifier(value, this.#pinPolicy);
      return true;
    } catch (error) {
      this.#setError(toLambdaError(error, "LAMBDA_POLICY_DENIED"));
      return false;
    }
  }

  async invoke(options: Partial<LambdaInvokeOptions> = {}): Promise<LambdaInvokeResponse | undefined> {
    this.#activeController?.abort();

    const invocationId = ++this.#activeInvocationId;
    const controller = new AbortController();
    this.#activeController = controller;
    this.#setInvoking(true);
    this.#clearOutputs();

    const startedAt = now();

    try {
      if (options.functionName !== undefined && !this.#trySetFunctionName(options.functionName)) {
        return undefined;
      }
      if (options.payload !== undefined) this.payload = options.payload;
      if (options.qualifier !== undefined && !this.#trySetQualifier(options.qualifier ?? null)) {
        return undefined;
      }
      if (options.clientContext !== undefined) this.clientContext = options.clientContext ?? null;
      if (options.logType !== undefined) this.logType = options.logType;
      if (options.mode !== undefined) this.mode = options.mode;

      if (!this.#provider) {
        throw new Error("No Lambda provider configured");
      }

      if (!this.#functionName) {
        throw new Error("functionName is required before invoke()");
      }

      const invokeOptions = {
        functionName: this.#functionName,
        payload: this.#payload,
        qualifier: this.#qualifier,
        clientContext: this.#clientContext,
        logType: this.#logType,
        mode: this.#mode,
        signal: controller.signal,
      } satisfies LambdaInvokeOptions;

      const response = this.#mode === "stream" && this.#provider.invokeStream
        ? await this.#invokeStream(this.#provider, invokeOptions, invocationId)
        : await this.#provider.invoke(invokeOptions);

      if (!this.#isCurrentInvocation(invocationId) || controller.signal.aborted) {
        return response;
      }

      this.#setDuration(now() - startedAt);
      this.#setStatusCode(response.statusCode ?? null);
      this.#setFunctionError(response.functionError ?? null);
      this.#setExecutedVersion(response.executedVersion ?? null);
      this.#setRequestId(response.requestId ?? null);
      this.#setLogResult(response.logResult ?? null);
      this.#setResult(response.result ?? null);

      if (response.functionError) {
        const normalized = toLambdaError(
          new Error(`Lambda function returned ${response.functionError}`),
          "LAMBDA_FUNCTION_ERROR",
        );
        this.#setError(normalized);
        if (this.#mode === "stream") {
          this.#setStreamError(normalized);
        }
      }

      if (this.#mode === "stream" && !this.#provider.invokeStream) {
        this.#setStreaming(true);
        this.#setChunks(response.chunks ?? []);
        this.#setText(response.text ?? "");
        this.#setFirstByteLatency(response.firstByteLatency ?? null);
        this.#setDone(true);
        this.#setStreaming(false);
      }

      return response;
    } catch (error) {
      if (!this.#isCurrentInvocation(invocationId) || controller.signal.aborted) {
        return undefined;
      }

      const normalized = toLambdaError(
        error,
        this.#provider
            ? "LAMBDA_INVOKE_FAILED"
            : "LAMBDA_CONFIG_ERROR",
      );
      this.#setError(normalized);
      if (this.#mode === "stream") {
        this.#setStreaming(false);
        this.#setStreamError(normalized);
      }
      return undefined;
    } finally {
      if (this.#isCurrentInvocation(invocationId)) {
        this.#activeController = null;
        this.#setInvoking(false);
      }
    }
  }

  async #invokeStream(provider: ILambdaProvider, options: LambdaInvokeOptions, invocationId: number): Promise<LambdaInvokeResponse> {
    this.#setStreaming(true);

    const response = await provider.invokeStream!(options, {
      onChunk: (chunk) => {
        if (!this.#isCurrentInvocation(invocationId) || options.signal?.aborted) {
          return;
        }

        this.#applyStreamChunk(chunk);
      },
    });

    if (!this.#isCurrentInvocation(invocationId) || options.signal?.aborted) {
      this.#setStreaming(false);
      return response;
    }

    this.#setDone(true);
    this.#setStreaming(false);
    return response;
  }

  #applyStreamChunk(chunk: LambdaStreamChunk): void {
    this.#setChunks([...this.#chunks, chunk.chunk]);

    const nextText = this.#text + (chunk.textDelta ?? chunk.chunk);
    this.#setText(nextText);

    if (this.#firstByteLatency === null && chunk.firstByteLatency !== undefined) {
      this.#setFirstByteLatency(chunk.firstByteLatency ?? null);
    }
  }

  abort(): void {
    const hadActiveInvocation = this.#activeController !== null || this.#invoking || this.#streaming;
    this.#activeInvocationId++;
    this.#activeController?.abort();
    this.#activeController = null;
    if (hadActiveInvocation) {
      const abortedError = { code: "LAMBDA_ABORTED", message: "Invocation was aborted" } as const;
      this.#setError(abortedError);
      if (this.#mode === "stream") {
        this.#setStreamError(abortedError);
      }
    }
    this.#setInvoking(false);
    this.#setStreaming(false);
  }

  reset(): void {
    this.#activeInvocationId++;
    this.#activeController?.abort();
    this.#activeController = null;
    this.#clearOutputs();
    this.#setInvoking(false);
  }

  #clearOutputs(): void {
    this.#setResult(null);
    this.#setError(null);
    this.#setDuration(null);
    this.#setRequestId(null);
    this.#setStatusCode(null);
    this.#setFunctionError(null);
    this.#setExecutedVersion(null);
    this.#setLogResult(null);
    this.#setStreaming(false);
    this.#setChunks([]);
    this.#setText("");
    this.#setDone(false);
    this.#setFirstByteLatency(null);
    this.#setStreamError(null);
  }

  #setInvoking(value: boolean): void { if (this.#invoking === value) return; this.#invoking = value; this.#dispatch("lambda-invoke:invoking-changed", value); }
  #setResult(value: unknown): void { if (this.#result === value) return; this.#result = value; this.#dispatch("lambda-invoke:result-changed", value); }
  #setError(value: LambdaError | null): void { if (this.#error === value) return; this.#error = value; this.#dispatch("lambda-invoke:error", value); }
  #setDuration(value: number | null): void { if (this.#duration === value) return; this.#duration = value; this.#dispatch("lambda-invoke:duration-changed", value); }
  #setRequestId(value: string | null): void { if (this.#requestId === value) return; this.#requestId = value; this.#dispatch("lambda-invoke:request-id-changed", value); }
  #setStatusCode(value: number | null): void { if (this.#statusCode === value) return; this.#statusCode = value; this.#dispatch("lambda-invoke:status-code-changed", value); }
  #setFunctionError(value: string | null): void { if (this.#functionError === value) return; this.#functionError = value; this.#dispatch("lambda-invoke:function-error-changed", value); }
  #setExecutedVersion(value: string | null): void { if (this.#executedVersion === value) return; this.#executedVersion = value; this.#dispatch("lambda-invoke:executed-version-changed", value); }
  #setLogResult(value: string | null): void { if (this.#logResult === value) return; this.#logResult = value; this.#dispatch("lambda-invoke:log-result-changed", value); }
  #setStreaming(value: boolean): void { if (this.#streaming === value) return; this.#streaming = value; this.#dispatch("lambda-invoke:streaming-changed", value); }
  #setChunks(value: string[]): void { if (stringArraysEqual(this.#chunks, value)) return; this.#chunks = [...value]; this.#dispatch("lambda-invoke:chunks-changed", this.chunks); }
  #setText(value: string): void { if (this.#text === value) return; this.#text = value; this.#dispatch("lambda-invoke:text-changed", value); }
  #setDone(value: boolean): void { if (this.#done === value) return; this.#done = value; this.#dispatch("lambda-invoke:done-changed", value); }
  #setFirstByteLatency(value: number | null): void { if (this.#firstByteLatency === value) return; this.#firstByteLatency = value; this.#dispatch("lambda-invoke:first-byte-latency-changed", value); }
  #setStreamError(value: LambdaError | null): void { if (this.#streamError === value) return; this.#streamError = value; this.#dispatch("lambda-invoke:stream-error", value); }

  #isCurrentInvocation(invocationId: number): boolean {
    return invocationId === this.#activeInvocationId;
  }

  #dispatch(eventName: string, detail: unknown): void {
    this.#target.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
  }
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function stringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}