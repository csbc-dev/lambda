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
var _LambdaInvoke_core;
import { LambdaCore } from "../core/LambdaCore.js";
export class LambdaInvoke extends HTMLElement {
    static get observedAttributes() {
        return ["function-name", "qualifier", "mode", "log-type", "client-context"];
    }
    constructor() {
        super();
        _LambdaInvoke_core.set(this, void 0);
        __classPrivateFieldSet(this, _LambdaInvoke_core, new LambdaCore(this), "f");
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
    get mode() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").mode; }
    set mode(value) {
        __classPrivateFieldGet(this, _LambdaInvoke_core, "f").mode = value;
        this.setAttribute("mode", value);
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
    get streaming() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").streaming; }
    get chunks() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").chunks; }
    get text() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").text; }
    get done() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").done; }
    get firstByteLatency() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").firstByteLatency; }
    get streamError() { return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").streamError; }
    async invoke() {
        return __classPrivateFieldGet(this, _LambdaInvoke_core, "f").invoke();
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
_LambdaInvoke_core = new WeakMap();
LambdaInvoke.wcBindable = LambdaCore.wcBindable;
//# sourceMappingURL=LambdaInvoke.js.map