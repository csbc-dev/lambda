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
var _LambdaRemoteProvider_instances, _LambdaRemoteProvider_url, _LambdaRemoteProvider_fetch, _LambdaRemoteProvider_headers, _LambdaRemoteProvider_sendInvoke;
import { toLambdaError } from "../raiseError.js";
export class LambdaRemoteProvider {
    constructor(options) {
        _LambdaRemoteProvider_instances.add(this);
        _LambdaRemoteProvider_url.set(this, void 0);
        _LambdaRemoteProvider_fetch.set(this, void 0);
        _LambdaRemoteProvider_headers.set(this, void 0);
        if (!options.url) {
            throw toLambdaError(new Error("Remote Lambda core URL is required"), "LAMBDA_CONFIG_ERROR");
        }
        __classPrivateFieldSet(this, _LambdaRemoteProvider_url, options.url, "f");
        __classPrivateFieldSet(this, _LambdaRemoteProvider_fetch, options.fetch ?? globalThis.fetch, "f");
        __classPrivateFieldSet(this, _LambdaRemoteProvider_headers, options.headers ?? {}, "f");
        if (!__classPrivateFieldGet(this, _LambdaRemoteProvider_fetch, "f")) {
            throw toLambdaError(new Error("fetch is not available for LambdaRemoteProvider"), "LAMBDA_CONFIG_ERROR");
        }
    }
    async invoke(options) {
        return __classPrivateFieldGet(this, _LambdaRemoteProvider_instances, "m", _LambdaRemoteProvider_sendInvoke).call(this, options);
    }
    async invokeStream(options, observer) {
        const response = await __classPrivateFieldGet(this, _LambdaRemoteProvider_instances, "m", _LambdaRemoteProvider_sendInvoke).call(this, {
            ...options,
            mode: "stream",
        });
        for (const [index, chunk] of (response.chunks ?? []).entries()) {
            observer.onChunk({
                chunk,
                textDelta: chunk,
                firstByteLatency: index === 0 ? response.firstByteLatency : undefined,
            });
        }
        return response;
    }
}
_LambdaRemoteProvider_url = new WeakMap(), _LambdaRemoteProvider_fetch = new WeakMap(), _LambdaRemoteProvider_headers = new WeakMap(), _LambdaRemoteProvider_instances = new WeakSet(), _LambdaRemoteProvider_sendInvoke = async function _LambdaRemoteProvider_sendInvoke(options) {
    const { signal, ...serializableOptions } = options;
    const body = {
        command: "invoke",
        options: serializableOptions,
    };
    const response = await __classPrivateFieldGet(this, _LambdaRemoteProvider_fetch, "f").call(this, __classPrivateFieldGet(this, _LambdaRemoteProvider_url, "f"), {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...__classPrivateFieldGet(this, _LambdaRemoteProvider_headers, "f"),
        },
        body: JSON.stringify(body),
        signal,
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw toLambdaError(payload.ok ? new Error(`Remote Lambda invoke failed with HTTP ${response.status}`) : payload.error, "LAMBDA_PROVIDER_ERROR");
    }
    return payload.response;
};
//# sourceMappingURL=LambdaRemoteProvider.js.map