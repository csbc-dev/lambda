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
var _LambdaCore_instances, _LambdaCore_target, _LambdaCore_provider, _LambdaCore_pinPolicy, _LambdaCore_functionName, _LambdaCore_payload, _LambdaCore_qualifier, _LambdaCore_clientContext, _LambdaCore_logType, _LambdaCore_mode, _LambdaCore_invoking, _LambdaCore_result, _LambdaCore_error, _LambdaCore_duration, _LambdaCore_requestId, _LambdaCore_statusCode, _LambdaCore_functionError, _LambdaCore_executedVersion, _LambdaCore_logResult, _LambdaCore_streaming, _LambdaCore_chunks, _LambdaCore_text, _LambdaCore_done, _LambdaCore_firstByteLatency, _LambdaCore_firstByteLatencyCaptured, _LambdaCore_streamError, _LambdaCore_activeInvocationId, _LambdaCore_activeController, _LambdaCore_trySetFunctionName, _LambdaCore_trySetQualifier, _LambdaCore_invokeStream, _LambdaCore_applyStreamChunk, _LambdaCore_clearOutputs, _LambdaCore_setInvoking, _LambdaCore_setResult, _LambdaCore_setError, _LambdaCore_setDuration, _LambdaCore_setRequestId, _LambdaCore_setStatusCode, _LambdaCore_setFunctionError, _LambdaCore_setExecutedVersion, _LambdaCore_setLogResult, _LambdaCore_setStreaming, _LambdaCore_setChunks, _LambdaCore_setText, _LambdaCore_setDone, _LambdaCore_setFirstByteLatency, _LambdaCore_setStreamError, _LambdaCore_nextInvocation, _LambdaCore_isCurrentInvocation, _LambdaCore_dispatch;
import { toLambdaError } from "../raiseError.js";
import { clonePinPolicy, resolveFunctionName, resolveLogType, resolveQualifier } from "../pinPolicy.js";
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
];
export class LambdaCore extends EventTarget {
    constructor(target, provider) {
        super();
        _LambdaCore_instances.add(this);
        _LambdaCore_target.set(this, void 0);
        _LambdaCore_provider.set(this, void 0);
        _LambdaCore_pinPolicy.set(this, {});
        _LambdaCore_functionName.set(this, "");
        _LambdaCore_payload.set(this, null);
        _LambdaCore_qualifier.set(this, null);
        _LambdaCore_clientContext.set(this, null);
        _LambdaCore_logType.set(this, "None");
        _LambdaCore_mode.set(this, "buffered");
        _LambdaCore_invoking.set(this, false);
        _LambdaCore_result.set(this, null);
        _LambdaCore_error.set(this, null);
        _LambdaCore_duration.set(this, null);
        _LambdaCore_requestId.set(this, null);
        _LambdaCore_statusCode.set(this, null);
        _LambdaCore_functionError.set(this, null);
        _LambdaCore_executedVersion.set(this, null);
        _LambdaCore_logResult.set(this, null);
        _LambdaCore_streaming.set(this, false);
        _LambdaCore_chunks.set(this, []);
        _LambdaCore_text.set(this, "");
        _LambdaCore_done.set(this, false);
        _LambdaCore_firstByteLatency.set(this, null);
        // Tracks whether first-byte latency has been *captured* for the active stream,
        // independent of its value. This separates "not yet captured" from the value
        // domain of #firstByteLatency (where `null` legitimately means "captured but
        // not measurable"): without it, a first chunk reporting `firstByteLatency:null`
        // would leave #firstByteLatency === null and let a *later* chunk's real value
        // overwrite it, breaking the first-byte-only semantics.
        _LambdaCore_firstByteLatencyCaptured.set(this, false);
        _LambdaCore_streamError.set(this, null);
        _LambdaCore_activeInvocationId.set(this, 0);
        _LambdaCore_activeController.set(this, null);
        __classPrivateFieldSet(this, _LambdaCore_target, target ?? this, "f");
        __classPrivateFieldSet(this, _LambdaCore_provider, provider ?? null, "f");
    }
    get functionName() { return __classPrivateFieldGet(this, _LambdaCore_functionName, "f"); }
    set functionName(value) { __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_trySetFunctionName).call(this, value); }
    get payload() { return __classPrivateFieldGet(this, _LambdaCore_payload, "f"); }
    set payload(value) { __classPrivateFieldSet(this, _LambdaCore_payload, value, "f"); }
    get qualifier() { return __classPrivateFieldGet(this, _LambdaCore_qualifier, "f"); }
    set qualifier(value) { __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_trySetQualifier).call(this, value); }
    get clientContext() { return __classPrivateFieldGet(this, _LambdaCore_clientContext, "f"); }
    set clientContext(value) { __classPrivateFieldSet(this, _LambdaCore_clientContext, value, "f"); }
    get logType() { return __classPrivateFieldGet(this, _LambdaCore_logType, "f"); }
    set logType(value) { __classPrivateFieldSet(this, _LambdaCore_logType, resolveLogType(value, __classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f")), "f"); }
    get mode() { return __classPrivateFieldGet(this, _LambdaCore_mode, "f"); }
    set mode(value) {
        // Suppress redundant events on same-value writes, matching every #setXxx.
        if (__classPrivateFieldGet(this, _LambdaCore_mode, "f") === value)
            return;
        __classPrivateFieldSet(this, _LambdaCore_mode, value, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:mode-changed", value);
    }
    get invoking() { return __classPrivateFieldGet(this, _LambdaCore_invoking, "f"); }
    get result() { return __classPrivateFieldGet(this, _LambdaCore_result, "f"); }
    get error() { return __classPrivateFieldGet(this, _LambdaCore_error, "f"); }
    get duration() { return __classPrivateFieldGet(this, _LambdaCore_duration, "f"); }
    get requestId() { return __classPrivateFieldGet(this, _LambdaCore_requestId, "f"); }
    get statusCode() { return __classPrivateFieldGet(this, _LambdaCore_statusCode, "f"); }
    get functionError() { return __classPrivateFieldGet(this, _LambdaCore_functionError, "f"); }
    get executedVersion() { return __classPrivateFieldGet(this, _LambdaCore_executedVersion, "f"); }
    get logResult() { return __classPrivateFieldGet(this, _LambdaCore_logResult, "f"); }
    get streaming() { return __classPrivateFieldGet(this, _LambdaCore_streaming, "f"); }
    get chunks() { return [...__classPrivateFieldGet(this, _LambdaCore_chunks, "f")]; }
    get text() { return __classPrivateFieldGet(this, _LambdaCore_text, "f"); }
    get done() { return __classPrivateFieldGet(this, _LambdaCore_done, "f"); }
    get firstByteLatency() { return __classPrivateFieldGet(this, _LambdaCore_firstByteLatency, "f"); }
    get streamError() { return __classPrivateFieldGet(this, _LambdaCore_streamError, "f"); }
    get pinPolicy() { return Object.freeze(clonePinPolicy(__classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f"))); }
    get hasProvider() { return __classPrivateFieldGet(this, _LambdaCore_provider, "f") !== null; }
    setProvider(provider) {
        __classPrivateFieldSet(this, _LambdaCore_provider, provider, "f");
    }
    setPinPolicy(policy) {
        __classPrivateFieldSet(this, _LambdaCore_pinPolicy, clonePinPolicy(policy), "f");
        // Re-resolving the already-set inputs against the new policy can fail (e.g.
        // the current functionName/qualifier is no longer in the new allowlist). The
        // Core owns a stable error surface (CSBC), so — like #trySetFunctionName /
        // #trySetQualifier — we must NOT let a raw policy exception escape to the
        // caller (LambdaInvoke.setPinPolicy does not try/catch). On failure, surface
        // a normalized LAMBDA_POLICY_DENIED error and leave the affected input as-is.
        try {
            if (__classPrivateFieldGet(this, _LambdaCore_functionName, "f") || __classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f").pinnedFunctionName) {
                __classPrivateFieldSet(this, _LambdaCore_functionName, resolveFunctionName(__classPrivateFieldGet(this, _LambdaCore_functionName, "f"), __classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f")), "f");
            }
            __classPrivateFieldSet(this, _LambdaCore_qualifier, resolveQualifier(__classPrivateFieldGet(this, _LambdaCore_qualifier, "f"), __classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f")), "f");
        }
        catch (error) {
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, toLambdaError(error, "LAMBDA_POLICY_DENIED"));
        }
        // resolveLogType never throws; it only clamps a pinned/overridable value.
        __classPrivateFieldSet(this, _LambdaCore_logType, resolveLogType(__classPrivateFieldGet(this, _LambdaCore_logType, "f"), __classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f")), "f");
    }
    /**
     * Run an invocation. Resolves to the response on success, or `undefined` when
     * no result is surfaced — the reason is reflected on the `error` property:
     * policy denial (`LAMBDA_POLICY_DENIED`), misconfiguration (`LAMBDA_CONFIG_ERROR`),
     * transport/Lambda failure (`LAMBDA_INVOKE_FAILED`), or abort (`LAMBDA_ABORTED`).
     * A call superseded by a newer invoke()/abort()/reset() also resolves
     * `undefined` and never overwrites the newer invocation's state. Never rejects.
     */
    async invoke(options = {}, observer) {
        // A new invoke() always supersedes any in-flight one: abort it and advance
        // the invocation id so its late result/finally can never win (see #nextInvocation).
        __classPrivateFieldGet(this, _LambdaCore_activeController, "f")?.abort();
        __classPrivateFieldSet(this, _LambdaCore_activeController, null, "f");
        const invocationId = __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_nextInvocation).call(this);
        // Resolve security-sensitive inputs (functionName/qualifier pinning policy)
        // BEFORE clearing outputs or entering the invoking state. SPEC 13/14: a
        // rejected invocation that never starts must surface only its policy error
        // and must not destroy previously surfaced good results or flip `invoking`
        // on. We still aborted/superseded any prior in-flight call above, because a
        // new invoke() call always wins regardless of whether its inputs validate.
        if (options.functionName !== undefined && !__classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_trySetFunctionName).call(this, options.functionName)) {
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
            return undefined;
        }
        if (options.qualifier !== undefined && !__classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_trySetQualifier).call(this, options.qualifier ?? null)) {
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
            return undefined;
        }
        const controller = new AbortController();
        __classPrivateFieldSet(this, _LambdaCore_activeController, controller, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, true);
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_clearOutputs).call(this);
        const startedAt = now();
        try {
            if (options.payload !== undefined)
                this.payload = options.payload;
            if (options.clientContext !== undefined)
                this.clientContext = options.clientContext ?? null;
            if (options.logType !== undefined)
                this.logType = options.logType;
            if (options.mode !== undefined)
                this.mode = options.mode;
            if (!__classPrivateFieldGet(this, _LambdaCore_provider, "f")) {
                throw new Error("No Lambda provider configured");
            }
            if (!__classPrivateFieldGet(this, _LambdaCore_functionName, "f")) {
                throw new Error("functionName is required before invoke()");
            }
            const invokeOptions = {
                functionName: __classPrivateFieldGet(this, _LambdaCore_functionName, "f"),
                payload: __classPrivateFieldGet(this, _LambdaCore_payload, "f"),
                qualifier: __classPrivateFieldGet(this, _LambdaCore_qualifier, "f"),
                clientContext: __classPrivateFieldGet(this, _LambdaCore_clientContext, "f"),
                logType: __classPrivateFieldGet(this, _LambdaCore_logType, "f"),
                mode: __classPrivateFieldGet(this, _LambdaCore_mode, "f"),
                signal: controller.signal,
            };
            const response = __classPrivateFieldGet(this, _LambdaCore_mode, "f") === "stream" && __classPrivateFieldGet(this, _LambdaCore_provider, "f").invokeStream
                ? await __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_invokeStream).call(this, __classPrivateFieldGet(this, _LambdaCore_provider, "f"), invokeOptions, invocationId, observer)
                : await __classPrivateFieldGet(this, _LambdaCore_provider, "f").invoke(invokeOptions);
            if (!__classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_isCurrentInvocation).call(this, invocationId) || controller.signal.aborted) {
                return response;
            }
            // Defensive normalization: the Core never surfaces `undefined`. Metadata
            // fields are typed `T | null` and `result` is typed `unknown` (required),
            // but providers are external (custom/remote) and may omit fields, so we
            // coerce any missing/undefined value to `null` uniformly. `result`'s `?? null`
            // is intentionally kept for the same reason as the metadata fields, not a
            // type mismatch — it guarantees a stable `null` rather than `undefined`.
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setDuration).call(this, now() - startedAt);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStatusCode).call(this, response.statusCode ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setFunctionError).call(this, response.functionError ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setExecutedVersion).call(this, response.executedVersion ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setRequestId).call(this, response.requestId ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setLogResult).call(this, response.logResult ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setResult).call(this, response.result ?? null);
            if (response.functionError) {
                const normalized = toLambdaError(new Error(`Lambda function returned ${response.functionError}`), "LAMBDA_FUNCTION_ERROR");
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, normalized);
                if (__classPrivateFieldGet(this, _LambdaCore_mode, "f") === "stream") {
                    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreamError).call(this, normalized);
                }
            }
            if (__classPrivateFieldGet(this, _LambdaCore_mode, "f") === "stream" && !__classPrivateFieldGet(this, _LambdaCore_provider, "f").invokeStream) {
                // Buffer-and-replay fallback: the provider has no live streaming path,
                // so the buffered response is projected as the stream surface after
                // completion. `response.firstByteLatency` here is the value the
                // server/provider measured and serialized into the buffered response,
                // replayed verbatim — it is NOT consumer-/browser-perceived first-byte
                // latency, since nothing arrived incrementally. The property's meaning
                // is contract-stable; only its fidelity differs by transport
                // (SPEC 9.2, ADR 0001 backward-compatible fallback).
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, true);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setChunks).call(this, response.chunks ?? []);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setText).call(this, response.text ?? "");
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setFirstByteLatency).call(this, response.firstByteLatency ?? null);
                // Keep the "first-byte latency captured once" invariant consistent across
                // paths. No live chunks follow this buffered fallback today, but marking
                // it captured here means the capture flag is the single source of truth
                // regardless of which path set the value (defensive consistency).
                __classPrivateFieldSet(this, _LambdaCore_firstByteLatencyCaptured, true, "f");
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setDone).call(this, true);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, false);
            }
            return response;
        }
        catch (error) {
            if (!__classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_isCurrentInvocation).call(this, invocationId) || controller.signal.aborted) {
                return undefined;
            }
            const normalized = toLambdaError(error, __classPrivateFieldGet(this, _LambdaCore_provider, "f")
                ? "LAMBDA_INVOKE_FAILED"
                : "LAMBDA_CONFIG_ERROR");
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, normalized);
            if (__classPrivateFieldGet(this, _LambdaCore_mode, "f") === "stream") {
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, false);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreamError).call(this, normalized);
            }
            return undefined;
        }
        finally {
            if (__classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_isCurrentInvocation).call(this, invocationId)) {
                __classPrivateFieldSet(this, _LambdaCore_activeController, null, "f");
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
            }
        }
    }
    abort() {
        const hadActiveInvocation = __classPrivateFieldGet(this, _LambdaCore_activeController, "f") !== null || __classPrivateFieldGet(this, _LambdaCore_invoking, "f") || __classPrivateFieldGet(this, _LambdaCore_streaming, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_nextInvocation).call(this);
        __classPrivateFieldGet(this, _LambdaCore_activeController, "f")?.abort();
        __classPrivateFieldSet(this, _LambdaCore_activeController, null, "f");
        if (hadActiveInvocation) {
            const abortedError = { code: "LAMBDA_ABORTED", message: "Invocation was aborted" };
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, abortedError);
            if (__classPrivateFieldGet(this, _LambdaCore_mode, "f") === "stream") {
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreamError).call(this, abortedError);
            }
        }
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, false);
    }
    reset() {
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_nextInvocation).call(this);
        __classPrivateFieldGet(this, _LambdaCore_activeController, "f")?.abort();
        __classPrivateFieldSet(this, _LambdaCore_activeController, null, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_clearOutputs).call(this);
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
    }
}
_LambdaCore_target = new WeakMap(), _LambdaCore_provider = new WeakMap(), _LambdaCore_pinPolicy = new WeakMap(), _LambdaCore_functionName = new WeakMap(), _LambdaCore_payload = new WeakMap(), _LambdaCore_qualifier = new WeakMap(), _LambdaCore_clientContext = new WeakMap(), _LambdaCore_logType = new WeakMap(), _LambdaCore_mode = new WeakMap(), _LambdaCore_invoking = new WeakMap(), _LambdaCore_result = new WeakMap(), _LambdaCore_error = new WeakMap(), _LambdaCore_duration = new WeakMap(), _LambdaCore_requestId = new WeakMap(), _LambdaCore_statusCode = new WeakMap(), _LambdaCore_functionError = new WeakMap(), _LambdaCore_executedVersion = new WeakMap(), _LambdaCore_logResult = new WeakMap(), _LambdaCore_streaming = new WeakMap(), _LambdaCore_chunks = new WeakMap(), _LambdaCore_text = new WeakMap(), _LambdaCore_done = new WeakMap(), _LambdaCore_firstByteLatency = new WeakMap(), _LambdaCore_firstByteLatencyCaptured = new WeakMap(), _LambdaCore_streamError = new WeakMap(), _LambdaCore_activeInvocationId = new WeakMap(), _LambdaCore_activeController = new WeakMap(), _LambdaCore_instances = new WeakSet(), _LambdaCore_trySetFunctionName = function _LambdaCore_trySetFunctionName(value) {
    try {
        __classPrivateFieldSet(this, _LambdaCore_functionName, resolveFunctionName(value, __classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f")), "f");
        return true;
    }
    catch (error) {
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, toLambdaError(error, "LAMBDA_POLICY_DENIED"));
        return false;
    }
}, _LambdaCore_trySetQualifier = function _LambdaCore_trySetQualifier(value) {
    try {
        __classPrivateFieldSet(this, _LambdaCore_qualifier, resolveQualifier(value, __classPrivateFieldGet(this, _LambdaCore_pinPolicy, "f")), "f");
        return true;
    }
    catch (error) {
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, toLambdaError(error, "LAMBDA_POLICY_DENIED"));
        return false;
    }
}, _LambdaCore_invokeStream = async function _LambdaCore_invokeStream(provider, options, invocationId, observer) {
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, true);
    const response = await provider.invokeStream(options, {
        onChunk: (chunk) => {
            if (!__classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_isCurrentInvocation).call(this, invocationId) || options.signal?.aborted) {
                return;
            }
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_applyStreamChunk).call(this, chunk);
            // Fan the chunk out to an external consumer (e.g. the remote handler
            // forwarding it over the network) while the Core stays the authority
            // for state. The forward happens only for live, non-aborted chunks.
            observer?.onChunk(chunk);
        },
    });
    if (!__classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_isCurrentInvocation).call(this, invocationId) || options.signal?.aborted) {
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
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setDone).call(this, true);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, false);
    return response;
}, _LambdaCore_applyStreamChunk = function _LambdaCore_applyStreamChunk(chunk) {
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setChunks).call(this, [...__classPrivateFieldGet(this, _LambdaCore_chunks, "f"), chunk.chunk]);
    const nextText = __classPrivateFieldGet(this, _LambdaCore_text, "f") + (chunk.textDelta ?? chunk.chunk);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setText).call(this, nextText);
    // Capture first-byte latency exactly once, from the first chunk that reports
    // it (a `firstByteLatency` of `undefined` means "this chunk does not carry
    // it"; an explicit `null` means "measured-as-not-available" and still counts
    // as captured, so a later chunk cannot overwrite it).
    if (!__classPrivateFieldGet(this, _LambdaCore_firstByteLatencyCaptured, "f") && chunk.firstByteLatency !== undefined) {
        __classPrivateFieldSet(this, _LambdaCore_firstByteLatencyCaptured, true, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setFirstByteLatency).call(this, chunk.firstByteLatency);
    }
}, _LambdaCore_clearOutputs = function _LambdaCore_clearOutputs() {
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setResult).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setDuration).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setRequestId).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStatusCode).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setFunctionError).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setExecutedVersion).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setLogResult).call(this, null);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, false);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setChunks).call(this, []);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setText).call(this, "");
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setDone).call(this, false);
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setFirstByteLatency).call(this, null);
    __classPrivateFieldSet(this, _LambdaCore_firstByteLatencyCaptured, false, "f");
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreamError).call(this, null);
}, _LambdaCore_setInvoking = function _LambdaCore_setInvoking(value) { if (__classPrivateFieldGet(this, _LambdaCore_invoking, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_invoking, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:invoking-changed", value); }, _LambdaCore_setResult = function _LambdaCore_setResult(value) { if (__classPrivateFieldGet(this, _LambdaCore_result, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_result, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:result-changed", value); }, _LambdaCore_setError = function _LambdaCore_setError(value) { if (__classPrivateFieldGet(this, _LambdaCore_error, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_error, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:error", value); }, _LambdaCore_setDuration = function _LambdaCore_setDuration(value) { if (__classPrivateFieldGet(this, _LambdaCore_duration, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_duration, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:duration-changed", value); }, _LambdaCore_setRequestId = function _LambdaCore_setRequestId(value) { if (__classPrivateFieldGet(this, _LambdaCore_requestId, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_requestId, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:request-id-changed", value); }, _LambdaCore_setStatusCode = function _LambdaCore_setStatusCode(value) { if (__classPrivateFieldGet(this, _LambdaCore_statusCode, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_statusCode, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:status-code-changed", value); }, _LambdaCore_setFunctionError = function _LambdaCore_setFunctionError(value) { if (__classPrivateFieldGet(this, _LambdaCore_functionError, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_functionError, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:function-error-changed", value); }, _LambdaCore_setExecutedVersion = function _LambdaCore_setExecutedVersion(value) { if (__classPrivateFieldGet(this, _LambdaCore_executedVersion, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_executedVersion, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:executed-version-changed", value); }, _LambdaCore_setLogResult = function _LambdaCore_setLogResult(value) { if (__classPrivateFieldGet(this, _LambdaCore_logResult, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_logResult, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:log-result-changed", value); }, _LambdaCore_setStreaming = function _LambdaCore_setStreaming(value) { if (__classPrivateFieldGet(this, _LambdaCore_streaming, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_streaming, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:streaming-changed", value); }, _LambdaCore_setChunks = function _LambdaCore_setChunks(value) { if (stringArraysEqual(__classPrivateFieldGet(this, _LambdaCore_chunks, "f"), value))
    return; __classPrivateFieldSet(this, _LambdaCore_chunks, [...value], "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:chunks-changed", this.chunks); }, _LambdaCore_setText = function _LambdaCore_setText(value) { if (__classPrivateFieldGet(this, _LambdaCore_text, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_text, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:text-changed", value); }, _LambdaCore_setDone = function _LambdaCore_setDone(value) { if (__classPrivateFieldGet(this, _LambdaCore_done, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_done, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:done-changed", value); }, _LambdaCore_setFirstByteLatency = function _LambdaCore_setFirstByteLatency(value) { if (__classPrivateFieldGet(this, _LambdaCore_firstByteLatency, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_firstByteLatency, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:first-byte-latency-changed", value); }, _LambdaCore_setStreamError = function _LambdaCore_setStreamError(value) { if (__classPrivateFieldGet(this, _LambdaCore_streamError, "f") === value)
    return; __classPrivateFieldSet(this, _LambdaCore_streamError, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:stream-error", value); }, _LambdaCore_nextInvocation = function _LambdaCore_nextInvocation() {
    var _a;
    return __classPrivateFieldSet(this, _LambdaCore_activeInvocationId, (_a = __classPrivateFieldGet(this, _LambdaCore_activeInvocationId, "f"), ++_a), "f");
}, _LambdaCore_isCurrentInvocation = function _LambdaCore_isCurrentInvocation(invocationId) {
    return invocationId === __classPrivateFieldGet(this, _LambdaCore_activeInvocationId, "f");
}, _LambdaCore_dispatch = function _LambdaCore_dispatch(eventName, detail) {
    __classPrivateFieldGet(this, _LambdaCore_target, "f").dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
};
LambdaCore.wcBindable = {
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
};
function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
}
function stringArraysEqual(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
//# sourceMappingURL=LambdaCore.js.map