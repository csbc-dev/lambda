import { LambdaCore } from "../core/LambdaCore.js";
import { getConfig, getRemoteCoreUrl } from "../config.js";
import { LambdaRemoteProvider } from "../remote/LambdaRemoteProvider.js";
import type { ILambdaProvider, LambdaError, LambdaMode, LambdaInvokeResponse, LambdaPinPolicy } from "../types.js";

const HTMLElementBase = (globalThis.HTMLElement ?? class extends EventTarget {}) as typeof HTMLElement;

export class LambdaInvoke extends HTMLElementBase {
  static wcBindable = LambdaCore.wcBindable;

  static get observedAttributes(): string[] {
    return ["function-name", "qualifier", "mode", "log-type", "client-context", "remote-url"];
  }

  #core: LambdaCore;

  constructor() {
    super();
    this.#core = new LambdaCore(this);
  }

  connectedCallback(): void {
    // Env-driven remote (the `@csbc-dev/lambda/auto/remoteEnv` entry sets
    // `remote.enableRemote` with `remoteSettingType: "env"`). When enabled,
    // auto-attach a remote provider from `getRemoteCoreUrl()` so production
    // markup needs no `remote-url` and no imperative attachRemote() call.
    //
    // Precedence: an explicit `remote-url` attribute or an already-set provider
    // (e.g. setProvider() before connect) wins — env only fills the gap.
    if (
      !this.hasAttribute("remote-url") &&
      !this.#core.hasProvider
    ) {
      this.#attachEnvRemote();
    }
  }

  /**
   * Attach a remote provider resolved from env config, if env-driven remote
   * mode is enabled and a URL is available. No-op otherwise. Used both on
   * connect and when an explicit `remote-url` is cleared, so detaching the
   * declarative URL falls back to the env-resolved Core instead of leaving the
   * element provider-less while env mode is active.
   */
  #attachEnvRemote(): void {
    if (!getConfig().remote.enableRemote) {
      return;
    }

    const url = getRemoteCoreUrl();
    if (url) {
      this.attachRemote(url);
    }
  }

  /**
   * Detach the declaratively-attached remote provider. If env-driven remote
   * mode is active, re-apply the env-resolved provider so the element stays
   * remote-first (symmetric with connectedCallback); otherwise drop to no
   * provider.
   */
  #detachRemote(): void {
    this.setProvider(null);
    this.#attachEnvRemote();
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
      case "remote-url":
        // Declarative remote attachment: a non-empty `remote-url` attaches a
        // LambdaRemoteProvider pointing at that URL; clearing the attribute
        // detaches it. This keeps the remote-first wiring in HTML — no
        // imperative attachRemote()/setProvider() call is needed. AWS
        // credentials never reach the browser: the URL points at a server-owned
        // Core, mirroring <auth0-gate>'s `remote-url`.
        if (newValue) {
          this.attachRemote(newValue);
        } else {
          this.#detachRemote();
        }
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

  get remoteUrl(): string { return this.getAttribute("remote-url") ?? ""; }
  set remoteUrl(value: string) {
    if (value) {
      this.setAttribute("remote-url", value);
    } else {
      this.removeAttribute("remote-url");
    }
  }

  get mode(): LambdaMode { return this.#core.mode; }
  set mode(value: LambdaMode) {
    this.#core.mode = value;
    if (this.getAttribute("mode") !== value) {
      this.setAttribute("mode", value);
    }
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
  // Stream-projection getters. These are NOT part of the parent's public
  // bindable contract (SPEC 7.1) — that contract lives in
  // `wcBindable.properties` and deliberately excludes them; stream output is the
  // child `<lambda-stream>` contract (SPEC 7.2). They exist here only as an
  // internal read surface that the child uses to project parent-owned state
  // (LambdaStream's #syncFromParent reads them, and isLambdaInvokeHost
  // ducktypes on `chunks`/`text`). Bind stream output through `<lambda-stream>`,
  // not through these getters.
  get streaming(): boolean { return this.#core.streaming; }
  get chunks(): string[] { return this.#core.chunks; }
  get text(): string { return this.#core.text; }
  get done(): boolean { return this.#core.done; }
  get firstByteLatency(): number | null { return this.#core.firstByteLatency; }
  get streamError(): LambdaError | null { return this.#core.streamError; }
  get pinPolicy(): Readonly<LambdaPinPolicy> { return this.#core.pinPolicy; }

  /**
   * Start an invocation against the attached (typically remote) Core.
   *
   * Resolves to the {@link LambdaInvokeResponse} on success. Resolves to
   * `undefined` (it never rejects) when the invocation does not produce a
   * surfaced result, in which case the failure is reflected on the bindable
   * `error` property:
   * - input/policy rejection (`functionName`/`qualifier` denied by pin policy) — `error.code === "LAMBDA_POLICY_DENIED"`
   * - no provider attached or missing `functionName` — `error.code === "LAMBDA_CONFIG_ERROR"`
   * - transport/provider/Lambda failure — `error.code === "LAMBDA_INVOKE_FAILED"`
   * - aborted, or superseded by a newer invoke()/abort()/reset() before completing — resolves `undefined`; an aborted call sets `error.code === "LAMBDA_ABORTED"`, a superseded call leaves the newer invocation's state intact
   *
   * Callers must not assume a defined return value implies success-only flow;
   * read `error`/`result` for authoritative state.
   */
  async invoke(): Promise<LambdaInvokeResponse | undefined> {
    return this.#core.invoke();
  }

  setProvider(provider: ILambdaProvider | null): void {
    this.#core.setProvider(provider);
  }

  attachRemote(url = getRemoteCoreUrl()): void {
    // An empty URL is a misconfiguration, not a silent no-op: LambdaRemoteProvider
    // throws a normalized LAMBDA_CONFIG_ERROR for an empty url, so an explicit
    // bad call fails fast. The env auto-attach path (#attachEnvRemote) guards
    // with `if (url)` and never reaches here with an empty string, and
    // getRemoteCoreUrl() now reports an empty env var as "" (= unset).
    this.setProvider(new LambdaRemoteProvider({ url }));
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