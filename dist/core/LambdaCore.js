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
var _LambdaCore_instances, _LambdaCore_target, _LambdaCore_provider, _LambdaCore_functionName, _LambdaCore_payload, _LambdaCore_qualifier, _LambdaCore_clientContext, _LambdaCore_logType, _LambdaCore_mode, _LambdaCore_invoking, _LambdaCore_result, _LambdaCore_error, _LambdaCore_duration, _LambdaCore_requestId, _LambdaCore_statusCode, _LambdaCore_functionError, _LambdaCore_executedVersion, _LambdaCore_logResult, _LambdaCore_streaming, _LambdaCore_chunks, _LambdaCore_text, _LambdaCore_done, _LambdaCore_firstByteLatency, _LambdaCore_streamError, _LambdaCore_aborted, _LambdaCore_clearOutputs, _LambdaCore_setInvoking, _LambdaCore_setResult, _LambdaCore_setError, _LambdaCore_setDuration, _LambdaCore_setRequestId, _LambdaCore_setStatusCode, _LambdaCore_setFunctionError, _LambdaCore_setExecutedVersion, _LambdaCore_setLogResult, _LambdaCore_setStreaming, _LambdaCore_setChunks, _LambdaCore_setText, _LambdaCore_setDone, _LambdaCore_setFirstByteLatency, _LambdaCore_setStreamError, _LambdaCore_dispatch;
import { toLambdaError } from "../raiseError.js";
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
];
export class LambdaCore extends EventTarget {
    constructor(target, provider) {
        super();
        _LambdaCore_instances.add(this);
        _LambdaCore_target.set(this, void 0);
        _LambdaCore_provider.set(this, void 0);
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
        _LambdaCore_streamError.set(this, null);
        _LambdaCore_aborted.set(this, false);
        __classPrivateFieldSet(this, _LambdaCore_target, target ?? this, "f");
        __classPrivateFieldSet(this, _LambdaCore_provider, provider ?? null, "f");
    }
    get functionName() { return __classPrivateFieldGet(this, _LambdaCore_functionName, "f"); }
    set functionName(value) { __classPrivateFieldSet(this, _LambdaCore_functionName, value, "f"); }
    get payload() { return __classPrivateFieldGet(this, _LambdaCore_payload, "f"); }
    set payload(value) { __classPrivateFieldSet(this, _LambdaCore_payload, value, "f"); }
    get qualifier() { return __classPrivateFieldGet(this, _LambdaCore_qualifier, "f"); }
    set qualifier(value) { __classPrivateFieldSet(this, _LambdaCore_qualifier, value, "f"); }
    get clientContext() { return __classPrivateFieldGet(this, _LambdaCore_clientContext, "f"); }
    set clientContext(value) { __classPrivateFieldSet(this, _LambdaCore_clientContext, value, "f"); }
    get logType() { return __classPrivateFieldGet(this, _LambdaCore_logType, "f"); }
    set logType(value) { __classPrivateFieldSet(this, _LambdaCore_logType, value, "f"); }
    get mode() { return __classPrivateFieldGet(this, _LambdaCore_mode, "f"); }
    set mode(value) {
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
    setProvider(provider) {
        __classPrivateFieldSet(this, _LambdaCore_provider, provider, "f");
    }
    async invoke(options = {}) {
        if (options.functionName !== undefined)
            this.functionName = options.functionName;
        if (options.payload !== undefined)
            this.payload = options.payload;
        if (options.qualifier !== undefined)
            this.qualifier = options.qualifier ?? null;
        if (options.clientContext !== undefined)
            this.clientContext = options.clientContext ?? null;
        if (options.logType !== undefined)
            this.logType = options.logType;
        if (options.mode !== undefined)
            this.mode = options.mode;
        __classPrivateFieldSet(this, _LambdaCore_aborted, false, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, true);
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_clearOutputs).call(this);
        const startedAt = now();
        try {
            if (!__classPrivateFieldGet(this, _LambdaCore_provider, "f")) {
                throw new Error("No Lambda provider configured");
            }
            if (!__classPrivateFieldGet(this, _LambdaCore_functionName, "f")) {
                throw new Error("functionName is required before invoke()");
            }
            const response = await __classPrivateFieldGet(this, _LambdaCore_provider, "f").invoke({
                functionName: __classPrivateFieldGet(this, _LambdaCore_functionName, "f"),
                payload: __classPrivateFieldGet(this, _LambdaCore_payload, "f"),
                qualifier: __classPrivateFieldGet(this, _LambdaCore_qualifier, "f"),
                clientContext: __classPrivateFieldGet(this, _LambdaCore_clientContext, "f"),
                logType: __classPrivateFieldGet(this, _LambdaCore_logType, "f"),
                mode: __classPrivateFieldGet(this, _LambdaCore_mode, "f"),
            });
            if (__classPrivateFieldGet(this, _LambdaCore_aborted, "f")) {
                return response;
            }
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setDuration).call(this, now() - startedAt);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStatusCode).call(this, response.statusCode ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setFunctionError).call(this, response.functionError ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setExecutedVersion).call(this, response.executedVersion ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setRequestId).call(this, response.requestId ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setLogResult).call(this, response.logResult ?? null);
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setResult).call(this, response.result ?? null);
            if (__classPrivateFieldGet(this, _LambdaCore_mode, "f") === "stream") {
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, true);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setChunks).call(this, response.chunks ?? []);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setText).call(this, response.text ?? "");
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setFirstByteLatency).call(this, response.firstByteLatency ?? null);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setDone).call(this, true);
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, false);
            }
            return response;
        }
        catch (error) {
            const normalized = toLambdaError(error, __classPrivateFieldGet(this, _LambdaCore_aborted, "f")
                ? "LAMBDA_ABORTED"
                : __classPrivateFieldGet(this, _LambdaCore_provider, "f")
                    ? "LAMBDA_INVOKE_FAILED"
                    : "LAMBDA_CONFIG_ERROR");
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setError).call(this, normalized);
            if (__classPrivateFieldGet(this, _LambdaCore_mode, "f") === "stream") {
                __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreamError).call(this, normalized);
            }
            return undefined;
        }
        finally {
            __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
        }
    }
    abort() {
        __classPrivateFieldSet(this, _LambdaCore_aborted, true, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreaming).call(this, false);
    }
    reset() {
        __classPrivateFieldSet(this, _LambdaCore_aborted, false, "f");
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_clearOutputs).call(this);
        __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setInvoking).call(this, false);
    }
}
_LambdaCore_target = new WeakMap(), _LambdaCore_provider = new WeakMap(), _LambdaCore_functionName = new WeakMap(), _LambdaCore_payload = new WeakMap(), _LambdaCore_qualifier = new WeakMap(), _LambdaCore_clientContext = new WeakMap(), _LambdaCore_logType = new WeakMap(), _LambdaCore_mode = new WeakMap(), _LambdaCore_invoking = new WeakMap(), _LambdaCore_result = new WeakMap(), _LambdaCore_error = new WeakMap(), _LambdaCore_duration = new WeakMap(), _LambdaCore_requestId = new WeakMap(), _LambdaCore_statusCode = new WeakMap(), _LambdaCore_functionError = new WeakMap(), _LambdaCore_executedVersion = new WeakMap(), _LambdaCore_logResult = new WeakMap(), _LambdaCore_streaming = new WeakMap(), _LambdaCore_chunks = new WeakMap(), _LambdaCore_text = new WeakMap(), _LambdaCore_done = new WeakMap(), _LambdaCore_firstByteLatency = new WeakMap(), _LambdaCore_streamError = new WeakMap(), _LambdaCore_aborted = new WeakMap(), _LambdaCore_instances = new WeakSet(), _LambdaCore_clearOutputs = function _LambdaCore_clearOutputs() {
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
    __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_setStreamError).call(this, null);
}, _LambdaCore_setInvoking = function _LambdaCore_setInvoking(value) { __classPrivateFieldSet(this, _LambdaCore_invoking, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:invoking-changed", value); }, _LambdaCore_setResult = function _LambdaCore_setResult(value) { __classPrivateFieldSet(this, _LambdaCore_result, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:result-changed", value); }, _LambdaCore_setError = function _LambdaCore_setError(value) { __classPrivateFieldSet(this, _LambdaCore_error, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:error", value); }, _LambdaCore_setDuration = function _LambdaCore_setDuration(value) { __classPrivateFieldSet(this, _LambdaCore_duration, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:duration-changed", value); }, _LambdaCore_setRequestId = function _LambdaCore_setRequestId(value) { __classPrivateFieldSet(this, _LambdaCore_requestId, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:request-id-changed", value); }, _LambdaCore_setStatusCode = function _LambdaCore_setStatusCode(value) { __classPrivateFieldSet(this, _LambdaCore_statusCode, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:status-code-changed", value); }, _LambdaCore_setFunctionError = function _LambdaCore_setFunctionError(value) { __classPrivateFieldSet(this, _LambdaCore_functionError, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:function-error-changed", value); }, _LambdaCore_setExecutedVersion = function _LambdaCore_setExecutedVersion(value) { __classPrivateFieldSet(this, _LambdaCore_executedVersion, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:executed-version-changed", value); }, _LambdaCore_setLogResult = function _LambdaCore_setLogResult(value) { __classPrivateFieldSet(this, _LambdaCore_logResult, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:log-result-changed", value); }, _LambdaCore_setStreaming = function _LambdaCore_setStreaming(value) { __classPrivateFieldSet(this, _LambdaCore_streaming, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:streaming-changed", value); }, _LambdaCore_setChunks = function _LambdaCore_setChunks(value) { __classPrivateFieldSet(this, _LambdaCore_chunks, [...value], "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:chunks-changed", this.chunks); }, _LambdaCore_setText = function _LambdaCore_setText(value) { __classPrivateFieldSet(this, _LambdaCore_text, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:text-changed", value); }, _LambdaCore_setDone = function _LambdaCore_setDone(value) { __classPrivateFieldSet(this, _LambdaCore_done, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:done-changed", value); }, _LambdaCore_setFirstByteLatency = function _LambdaCore_setFirstByteLatency(value) { __classPrivateFieldSet(this, _LambdaCore_firstByteLatency, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:first-byte-latency-changed", value); }, _LambdaCore_setStreamError = function _LambdaCore_setStreamError(value) { __classPrivateFieldSet(this, _LambdaCore_streamError, value, "f"); __classPrivateFieldGet(this, _LambdaCore_instances, "m", _LambdaCore_dispatch).call(this, "lambda-invoke:stream-error", value); }, _LambdaCore_dispatch = function _LambdaCore_dispatch(eventName, detail) {
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
//# sourceMappingURL=LambdaCore.js.map