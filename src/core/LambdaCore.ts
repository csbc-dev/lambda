import { toLambdaError } from "../raiseError.js";
import { clonePinPolicy, resolveFunctionName, resolveLogType, resolveQualifier } from "../pinPolicy.js";
import type {
  ILambdaProvider,
  LambdaError,
  LambdaInvokeOptions,
  LambdaInvokeResponse,
  LambdaMode,
  LambdaPinPolicy,
  LambdaStreamChunk,
  LambdaStreamObserver,
} from "../types.js";

// The PARENT's public bindable contract (SPEC 7.1). This is exactly the set
// surfaced through `<lambda-invoke>` and the Core's `static wcBindable`.
//
// Stream-projection state (streaming/chunks/text/done/firstByteLatency/
// streamError) is DELIBERATELY NOT listed here. Per SPEC 7.2 those belong to
// the child `<lambda-stream>` contract, not the parent. The Core still HOLDS
// that state and still DISPATCHES its `lambda-invoke:*-changed` events (the
// child subscribes to those event names directly — see LambdaStream's
// parentEvents — and reads the parent's getters to project them). Keeping the
// state + events internal while not advertising them on the parent's
// `wcBindable.properties` avoids the double-exposure called out against SPEC
// 7.1: a framework adapter binding `<lambda-invoke>` sees only parent-owned
// properties, and stream output is bound through `<lambda-stream>`.
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
  // Tracks whether first-byte latency has been *captured* for the active stream,
  // independent of its value. This separates "not yet captured" from the value
  // domain of #firstByteLatency (where `null` legitimately means "captured but
  // not measurable"): without it, a first chunk reporting `firstByteLatency:null`
  // would leave #firstByteLatency === null and let a *later* chunk's real value
  // overwrite it, breaking the first-byte-only semantics.
  #firstByteLatencyCaptured = false;
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
  set logType(value: "None" | "Tail") { this.#logType = resolveLogType(value, this.#pinPolicy); }

  get mode(): LambdaMode { return this.#mode; }
  set mode(value: LambdaMode) {
    // Suppress redundant events on same-value writes, matching every #setXxx.
    if (this.#mode === value) return;
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

    // Re-resolving the already-set inputs against the new policy can fail (e.g.
    // the current functionName/qualifier is no longer in the new allowlist). The
    // Core owns a stable error surface (CSBC), so — like #trySetFunctionName /
    // #trySetQualifier — we must NOT let a raw policy exception escape to the
    // caller (LambdaInvoke.setPinPolicy does not try/catch). On failure, surface
    // a normalized LAMBDA_POLICY_DENIED error and leave the affected input as-is.
    try {
      if (this.#functionName || this.#pinPolicy.pinnedFunctionName) {
        this.#functionName = resolveFunctionName(this.#functionName, this.#pinPolicy);
      }
      this.#qualifier = resolveQualifier(this.#qualifier, this.#pinPolicy);
    } catch (error) {
      this.#setError(toLambdaError(error, "LAMBDA_POLICY_DENIED"));
    }

    // resolveLogType never throws; it only clamps a pinned/overridable value.
    this.#logType = resolveLogType(this.#logType, this.#pinPolicy);
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

  /**
   * Run an invocation. Resolves to the response on success, or `undefined` when
   * no result is surfaced — the reason is reflected on the `error` property:
   * policy denial (`LAMBDA_POLICY_DENIED`), misconfiguration (`LAMBDA_CONFIG_ERROR`),
   * transport/Lambda failure (`LAMBDA_INVOKE_FAILED`), or abort (`LAMBDA_ABORTED`).
   * A call superseded by a newer invoke()/abort()/reset() also resolves
   * `undefined` and never overwrites the newer invocation's state. Never rejects.
   */
  async invoke(
    options: Partial<LambdaInvokeOptions> = {},
    observer?: LambdaStreamObserver,
  ): Promise<LambdaInvokeResponse | undefined> {
    // A new invoke() always supersedes any in-flight one: abort it and advance
    // the invocation id so its late result/finally can never win (see #nextInvocation).
    this.#activeController?.abort();
    this.#activeController = null;
    const invocationId = this.#nextInvocation();

    // Resolve security-sensitive inputs (functionName/qualifier pinning policy)
    // BEFORE clearing outputs or entering the invoking state. SPEC 13/14: a
    // rejected invocation that never starts must surface only its policy error
    // and must not destroy previously surfaced good results or flip `invoking`
    // on. We still aborted/superseded any prior in-flight call above, because a
    // new invoke() call always wins regardless of whether its inputs validate.
    if (options.functionName !== undefined && !this.#trySetFunctionName(options.functionName)) {
      this.#setInvoking(false);
      return undefined;
    }
    if (options.qualifier !== undefined && !this.#trySetQualifier(options.qualifier ?? null)) {
      this.#setInvoking(false);
      return undefined;
    }

    const controller = new AbortController();
    this.#activeController = controller;
    this.#setInvoking(true);
    this.#clearOutputs();

    const startedAt = now();

    try {
      if (options.payload !== undefined) this.payload = options.payload;
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
        ? await this.#invokeStream(this.#provider, invokeOptions, invocationId, observer)
        : await this.#provider.invoke(invokeOptions);

      if (!this.#isCurrentInvocation(invocationId) || controller.signal.aborted) {
        return response;
      }

      // Defensive normalization: the Core never surfaces `undefined`. Metadata
      // fields are typed `T | null` and `result` is typed `unknown` (required),
      // but providers are external (custom/remote) and may omit fields, so we
      // coerce any missing/undefined value to `null` uniformly. `result`'s `?? null`
      // is intentionally kept for the same reason as the metadata fields, not a
      // type mismatch — it guarantees a stable `null` rather than `undefined`.
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
        // Buffer-and-replay fallback: the provider has no live streaming path,
        // so the buffered response is projected as the stream surface after
        // completion. `response.firstByteLatency` here is the value the
        // server/provider measured and serialized into the buffered response,
        // replayed verbatim — it is NOT consumer-/browser-perceived first-byte
        // latency, since nothing arrived incrementally. The property's meaning
        // is contract-stable; only its fidelity differs by transport
        // (SPEC 9.2, ADR 0001 backward-compatible fallback).
        this.#setStreaming(true);
        this.#setChunks(response.chunks ?? []);
        this.#setText(response.text ?? "");
        this.#setFirstByteLatency(response.firstByteLatency ?? null);
        // Keep the "first-byte latency captured once" invariant consistent across
        // paths. No live chunks follow this buffered fallback today, but marking
        // it captured here means the capture flag is the single source of truth
        // regardless of which path set the value (defensive consistency).
        this.#firstByteLatencyCaptured = true;
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

  async #invokeStream(
    provider: ILambdaProvider,
    options: LambdaInvokeOptions,
    invocationId: number,
    observer?: LambdaStreamObserver,
  ): Promise<LambdaInvokeResponse> {
    this.#setStreaming(true);

    const response = await provider.invokeStream!(options, {
      onChunk: (chunk) => {
        if (!this.#isCurrentInvocation(invocationId) || options.signal?.aborted) {
          return;
        }

        this.#applyStreamChunk(chunk);
        // Fan the chunk out to an external consumer (e.g. the remote handler
        // forwarding it over the network) while the Core stays the authority
        // for state. The forward happens only for live, non-aborted chunks.
        observer?.onChunk(chunk);
      },
    });

    if (!this.#isCurrentInvocation(invocationId) || options.signal?.aborted) {
      // Superseded or aborted: a newer invoke()/abort()/reset() has taken over.
      // Do NOT touch surfaced state here — the same regularity the invoke() body
      // and catch follow (a stale continuation never mutates surfaced state, so a
      // late result cannot win). Flipping #setStreaming(false) in this branch
      // would corrupt a *newer* stream invocation that has already set
      // streaming=true (the bundled SDK provider resolves a partial response on
      // abort rather than throwing, so this branch is reachable). The owning
      // operation (abort/reset, or the newer invoke's own #invokeStream) is
      // responsible for the streaming flag.
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

    // Capture first-byte latency exactly once, from the first chunk that reports
    // it (a `firstByteLatency` of `undefined` means "this chunk does not carry
    // it"; an explicit `null` means "measured-as-not-available" and still counts
    // as captured, so a later chunk cannot overwrite it).
    if (!this.#firstByteLatencyCaptured && chunk.firstByteLatency !== undefined) {
      this.#firstByteLatencyCaptured = true;
      this.#setFirstByteLatency(chunk.firstByteLatency);
    }
  }

  abort(): void {
    const hadActiveInvocation = this.#activeController !== null || this.#invoking || this.#streaming;
    this.#nextInvocation();
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
    this.#nextInvocation();
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
    this.#firstByteLatencyCaptured = false;
    this.#setStreamError(null);
  }

  #setInvoking(value: boolean): void { if (this.#invoking === value) return; this.#invoking = value; this.#dispatch("lambda-invoke:invoking-changed", value); }
  // `result` holds an arbitrary provider value (object, primitive, etc.). We
  // intentionally dedup by identity (===), not structural equality: each invoke
  // produces a fresh value, so a new result is always a new reference, and we
  // do not pay an unbounded deep-compare on every set. Same-reference re-sets
  // (e.g. clearOutputs setting null when already null) are correctly suppressed.
  #setResult(value: unknown): void { if (this.#result === value) return; this.#result = value; this.#dispatch("lambda-invoke:result-changed", value); }
  // Errors dedup by identity (===), like every other field. This never
  // suppresses a genuine new error: every error producer (abort(),
  // setPinPolicy/#trySetXxx failures, the invoke() catch) builds a FRESH
  // LambdaError object via toLambdaError, so each is a new reference and fires.
  // Identity dedup only suppresses re-setting the exact same reference (e.g.
  // clearOutputs setting null when already null). Re-emitting the same error
  // object on a retry is not a requirement, so this tradeoff is intentional.
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

  // Single owner of the stale-invocation invariant. Every operation that
  // supersedes an in-flight invocation — invoke(), abort(), reset() — advances
  // this id exactly once and captures the new value. Any async continuation
  // (provider result, catch, finally, stream chunk) first checks
  // #isCurrentInvocation(capturedId): a non-matching id means a newer operation
  // has taken over, so the continuation must not touch surfaced state. This is
  // why a late result from a superseded/aborted/reset invocation can never win.
  #nextInvocation(): number {
    return ++this.#activeInvocationId;
  }

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