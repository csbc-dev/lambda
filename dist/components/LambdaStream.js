var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _LambdaStream_instances, _LambdaStream_parent, _LambdaStream_streaming, _LambdaStream_chunks, _LambdaStream_text, _LambdaStream_done, _LambdaStream_firstByteLatency, _LambdaStream_streamError, _LambdaStream_syncQueued, _LambdaStream_boundSync, _LambdaStream_attachToParent, _LambdaStream_detachFromParent, _LambdaStream_syncFromParent, _LambdaStream_queueSyncFromParent, _LambdaStream_setStreaming, _LambdaStream_setChunks, _LambdaStream_setText, _LambdaStream_setDone, _LambdaStream_setFirstByteLatency, _LambdaStream_setStreamError;
import { getConfig } from "../config.js";
import { raiseError } from "../raiseError.js";
const HTMLElementBase = (globalThis.HTMLElement ?? class extends EventTarget {
});
const parentEvents = [
    "lambda-invoke:streaming-changed",
    "lambda-invoke:chunks-changed",
    "lambda-invoke:text-changed",
    "lambda-invoke:done-changed",
    "lambda-invoke:first-byte-latency-changed",
    "lambda-invoke:stream-error",
];
export class LambdaStream extends HTMLElementBase {
    constructor() {
        super(...arguments);
        _LambdaStream_instances.add(this);
        _LambdaStream_parent.set(this, null);
        _LambdaStream_streaming.set(this, false);
        _LambdaStream_chunks.set(this, []);
        _LambdaStream_text.set(this, "");
        _LambdaStream_done.set(this, false);
        _LambdaStream_firstByteLatency.set(this, null);
        _LambdaStream_streamError.set(this, null);
        _LambdaStream_syncQueued.set(this, false);
        _LambdaStream_boundSync.set(this, () => __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_queueSyncFromParent).call(this));
    }
    connectedCallback() {
        __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_attachToParent).call(this);
    }
    disconnectedCallback() {
        __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_detachFromParent).call(this);
    }
    get streaming() { return __classPrivateFieldGet(this, _LambdaStream_streaming, "f"); }
    get chunks() { return [...__classPrivateFieldGet(this, _LambdaStream_chunks, "f")]; }
    get text() { return __classPrivateFieldGet(this, _LambdaStream_text, "f"); }
    get done() { return __classPrivateFieldGet(this, _LambdaStream_done, "f"); }
    get firstByteLatency() { return __classPrivateFieldGet(this, _LambdaStream_firstByteLatency, "f"); }
    get streamError() { return __classPrivateFieldGet(this, _LambdaStream_streamError, "f"); }
}
_LambdaStream_parent = new WeakMap(), _LambdaStream_streaming = new WeakMap(), _LambdaStream_chunks = new WeakMap(), _LambdaStream_text = new WeakMap(), _LambdaStream_done = new WeakMap(), _LambdaStream_firstByteLatency = new WeakMap(), _LambdaStream_streamError = new WeakMap(), _LambdaStream_syncQueued = new WeakMap(), _LambdaStream_boundSync = new WeakMap(), _LambdaStream_instances = new WeakSet(), _LambdaStream_attachToParent = function _LambdaStream_attachToParent() {
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_detachFromParent).call(this);
    const tagName = getConfig().tagNames.lambdaInvoke;
    const candidate = this.closest(tagName);
    if (!(candidate instanceof HTMLElement)) {
        __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_setStreamError).call(this, raiseError(this, "lambda-stream:error", new Error("lambda-stream requires a parent lambda-invoke"), "LAMBDA_PARENT_REQUIRED"));
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_parent, candidate, "f");
    for (const eventName of parentEvents) {
        __classPrivateFieldGet(this, _LambdaStream_parent, "f").addEventListener(eventName, __classPrivateFieldGet(this, _LambdaStream_boundSync, "f"));
    }
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_syncFromParent).call(this);
}, _LambdaStream_detachFromParent = function _LambdaStream_detachFromParent() {
    if (!__classPrivateFieldGet(this, _LambdaStream_parent, "f")) {
        return;
    }
    for (const eventName of parentEvents) {
        __classPrivateFieldGet(this, _LambdaStream_parent, "f").removeEventListener(eventName, __classPrivateFieldGet(this, _LambdaStream_boundSync, "f"));
    }
    __classPrivateFieldSet(this, _LambdaStream_parent, null, "f");
}, _LambdaStream_syncFromParent = function _LambdaStream_syncFromParent() {
    if (!__classPrivateFieldGet(this, _LambdaStream_parent, "f")) {
        return;
    }
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_setStreaming).call(this, __classPrivateFieldGet(this, _LambdaStream_parent, "f").streaming);
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_setChunks).call(this, __classPrivateFieldGet(this, _LambdaStream_parent, "f").chunks);
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_setText).call(this, __classPrivateFieldGet(this, _LambdaStream_parent, "f").text);
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_setDone).call(this, __classPrivateFieldGet(this, _LambdaStream_parent, "f").done);
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_setFirstByteLatency).call(this, __classPrivateFieldGet(this, _LambdaStream_parent, "f").firstByteLatency);
    __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_setStreamError).call(this, __classPrivateFieldGet(this, _LambdaStream_parent, "f").streamError);
}, _LambdaStream_queueSyncFromParent = function _LambdaStream_queueSyncFromParent() {
    if (__classPrivateFieldGet(this, _LambdaStream_syncQueued, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_syncQueued, true, "f");
    queueMicrotask(() => {
        __classPrivateFieldSet(this, _LambdaStream_syncQueued, false, "f");
        __classPrivateFieldGet(this, _LambdaStream_instances, "m", _LambdaStream_syncFromParent).call(this);
    });
}, _LambdaStream_setStreaming = function _LambdaStream_setStreaming(value) {
    if (__classPrivateFieldGet(this, _LambdaStream_streaming, "f") === value) {
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_streaming, value, "f");
    this.dispatchEvent(new CustomEvent("lambda-stream:streaming-changed", { detail: value, bubbles: true }));
}, _LambdaStream_setChunks = function _LambdaStream_setChunks(value) {
    if (stringArraysEqual(__classPrivateFieldGet(this, _LambdaStream_chunks, "f"), value)) {
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_chunks, [...value], "f");
    this.dispatchEvent(new CustomEvent("lambda-stream:chunks-changed", { detail: this.chunks, bubbles: true }));
}, _LambdaStream_setText = function _LambdaStream_setText(value) {
    if (__classPrivateFieldGet(this, _LambdaStream_text, "f") === value) {
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_text, value, "f");
    this.dispatchEvent(new CustomEvent("lambda-stream:text-changed", { detail: value, bubbles: true }));
}, _LambdaStream_setDone = function _LambdaStream_setDone(value) {
    if (__classPrivateFieldGet(this, _LambdaStream_done, "f") === value) {
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_done, value, "f");
    this.dispatchEvent(new CustomEvent("lambda-stream:done-changed", { detail: value, bubbles: true }));
}, _LambdaStream_setFirstByteLatency = function _LambdaStream_setFirstByteLatency(value) {
    if (__classPrivateFieldGet(this, _LambdaStream_firstByteLatency, "f") === value) {
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_firstByteLatency, value, "f");
    this.dispatchEvent(new CustomEvent("lambda-stream:first-byte-latency-changed", { detail: value, bubbles: true }));
}, _LambdaStream_setStreamError = function _LambdaStream_setStreamError(value) {
    if (__classPrivateFieldGet(this, _LambdaStream_streamError, "f") === value) {
        return;
    }
    __classPrivateFieldSet(this, _LambdaStream_streamError, value, "f");
    this.dispatchEvent(new CustomEvent("lambda-stream:error", { detail: value, bubbles: true }));
};
LambdaStream.wcBindable = {
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
};
function stringArraysEqual(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
//# sourceMappingURL=LambdaStream.js.map