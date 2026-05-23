var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LambdaInvoke_instances, _LambdaInvoke_core, _LambdaInvoke_attachEnvRemote, _LambdaInvoke_detachRemote;
import { LambdaCore } from "../core/LambdaCore.js";
import { getConfig, getRemoteCoreUrl } from "../config.js";
import { LambdaRemoteProvider } from "../remote/LambdaRemoteProvider.js";
const HTMLElementBase = (globalThis.HTMLElement ?? class extends EventTarget {
});
export class LambdaInvoke extends HTMLElementBase {
    static get observedAttributes() {
        return ["function-name", "qualifier", "mode", "log-type", "client-context", "remote-url"];
    }
    constructor() {
        super();
        _LambdaInvoke_instances.add(this);
        _LambdaInvoke_core.set(this, void 0);
        __classPrivateFieldSet(this, _LambdaInvoke_core, new LambdaCore(this), "f");
    }
    connectedCallback() {
        // Env-driven remote (the `@csbc-dev/lambda/auto/remoteEnv` entry sets
        // `remote.enableRemote` with `remoteSettingType: "env"`). When enabled,
        // auto-attach a remote provider from `getRemoteCoreUrl()` so production
        // markup needs no `remote-url` and no imperative attachRemote() call.
        //
        // Precedence: an explicit `remote-url` attribute or an already-set provider
        // (e.g. setProvider() before connect) wins — env only fills the gap.
        if (!this.hasAttribute("remote-url") &&
            !__classPrivateFieldGet(this, _LambdaInvoke_core, "f").hasProvider) {
            __classPrivateFieldGet(this, _LambdaInvoke_instances, "m", _LambdaInvoke_attachEnvRemote).call(this);
        }
    }
    attributeChangedCallback(name, _oldValue, newValue) {
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
                }
                else {
                    __classPrivateFieldGet(this, _LambdaInvoke_instances, "m", _LambdaInvoke_detachRemote).call(this);
                }
                break;
        }
    }
    get functionName() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").functionName; }
    set functionName(value) { __classPrivateFieldGet(this, _LambdaInvoke_core, "f").functionName = value; }
    get payload() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").payload; }
    set payload(value) { __classPrivateFieldGet(this, _LambdaInvoke_core, "f").payload = value; }
    get qualifier() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").qualifier; }
    set qualifier(value) { __classPrivateFieldGet(this, _LambdaInvoke_core, "f").qualifier = value; }
    get clientContext() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").clientContext; }
    set clientContext(value) { __classPrivateFieldGet(this, _LambdaInvoke_core, "f").clientContext = value; }
    get logType() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").logType; }
    set logType(value) { __classPrivateFieldGet(this, _LambdaInvoke_core, "f").logType = value; }
    get remoteUrl() { return this.getAttribute("remote-url") ?? ""; }
    set remoteUrl(value) {
        if (value) {
            this.setAttribute("remote-url", value);
        }
        else {
            this.removeAttribute("remote-url");
        }
    }
    get mode() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").mode; }
    set mode(value) {
        __classPrivateFieldGet(this, _LambdaInvoke_core, "f").mode = value;
        if (this.getAttribute("mode") !== value) {
            this.setAttribute("mode", value);
        }
    }
    get invoking() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").invoking; }
    get result() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").result; }
    get error() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").error; }
    get duration() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").duration; }
    get requestId() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").requestId; }
    get statusCode() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").statusCode; }
    get functionError() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").functionError; }
    get executedVersion() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").executedVersion; }
    get logResult() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").logResult; }
    // Stream-projection getters. These are NOT part of the parent's public
    // bindable contract (SPEC 7.1) — that contract lives in
    // `wcBindable.properties` and deliberately excludes them; stream output is the
    // child `<lambda-stream>` contract (SPEC 7.2). They exist here only as an
    // internal read surface that the child uses to project parent-owned state
    // (LambdaStream's #syncFromParent reads them, and isLambdaInvokeHost
    // ducktypes on `chunks`/`text`). Bind stream output through `<lambda-stream>`,
    // not through these getters.
    get streaming() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").streaming; }
    get chunks() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").chunks; }
    get text() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").text; }
    get done() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").done; }
    get firstByteLatency() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").firstByteLatency; }
    get streamError() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").streamError; }
    get pinPolicy() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").pinPolicy; }
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
    async invoke() {
        return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").invoke();
    }
    setProvider(provider) {
        __classPrivateFieldGet(this, _LambdaInvoke_core, "f").setProvider(provider);
    }
    attachRemote(url = getRemoteCoreUrl()) {
        // An empty URL is a misconfiguration, not a silent no-op: LambdaRemoteProvider
        // throws a normalized LAMBDA_CONFIG_ERROR for an empty url, so an explicit
        // bad call fails fast. The env auto-attach path (#attachEnvRemote) guards
        // with `if (url)` and never reaches here with an empty string, and
        // getRemoteCoreUrl() now reports an empty env var as "" (= unset).
        this.setProvider(new LambdaRemoteProvider({ url }));
    }
    setPinPolicy(policy) {
        __classPrivateFieldGet(this, _LambdaInvoke_core, "f").setPinPolicy(policy);
    }
    abort() {
        __classPrivateFieldGet(this, _LambdaInvoke_core, "f").abort();
    }
    reset() {
        __classPrivateFieldGet(this, _LambdaInvoke_core, "f").reset();
    }
    get core() {
        return __classPrivateFieldGet(this, _LambdaInvoke_core, "f");
    }
}
_LambdaInvoke_core = new WeakMap(), _LambdaInvoke_instances = new WeakSet(), _LambdaInvoke_attachEnvRemote = function _LambdaInvoke_attachEnvRemote() {
    if (!getConfig().remote.enableRemote) {
        return;
    }
    const url = getRemoteCoreUrl();
    if (url) {
        this.attachRemote(url);
    }
}, _LambdaInvoke_detachRemote = function _LambdaInvoke_detachRemote() {
    this.setProvider(null);
    __classPrivateFieldGet(this, _LambdaInvoke_instances, "m", _LambdaInvoke_attachEnvRemote).call(this);
};
LambdaInvoke.wcBindable = LambdaCore.wcBindable;
//# sourceMappingURL=LambdaInvoke.js.map