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
var _LambdaRemoteProvider_instances, _LambdaRemoteProvider_url, _LambdaRemoteProvider_fetch, _LambdaRemoteProvider_headers, _LambdaRemoteProvider_post, _LambdaRemoteProvider_parseJsonResponse, _LambdaRemoteProvider_readStreamResponse;
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
        __classPrivateFieldSet(this, _LambdaRemoteProvider_fetch, options.fetch ?? globalThis.fetch?.bind(globalThis), "f");
        __classPrivateFieldSet(this, _LambdaRemoteProvider_headers, options.headers ?? {}, "f");
        if (!__classPrivateFieldGet(this, _LambdaRemoteProvider_fetch, "f")) {
            throw toLambdaError(new Error("fetch is not available for LambdaRemoteProvider"), "LAMBDA_CONFIG_ERROR");
        }
    }
    async invoke(options) {
        const response = await __classPrivateFieldGet(this, _LambdaRemoteProvider_instances, "m", _LambdaRemoteProvider_post).call(this, options);
        return __classPrivateFieldGet(this, _LambdaRemoteProvider_instances, "m", _LambdaRemoteProvider_parseJsonResponse).call(this, response);
    }
    async invokeStream(options, observer) {
        const response = await __classPrivateFieldGet(this, _LambdaRemoteProvider_instances, "m", _LambdaRemoteProvider_post).call(this, { ...options, mode: "stream" });
        const contentType = response.headers.get("content-type") ?? "";
        if (response.body && isNdjson(contentType)) {
            return __classPrivateFieldGet(this, _LambdaRemoteProvider_instances, "m", _LambdaRemoteProvider_readStreamResponse).call(this, response.body, observer);
        }
        // Backward-compatible fallback: a server that returns one buffered JSON
        // response rather than the NDJSON stream. Replay the returned chunks after
        // completion so the observer still sees them. `firstByteLatency` here is the
        // server-measured value, not browser-perceived.
        const buffered = await __classPrivateFieldGet(this, _LambdaRemoteProvider_instances, "m", _LambdaRemoteProvider_parseJsonResponse).call(this, response);
        replayBufferedChunks(buffered, observer);
        return buffered;
    }
}
_LambdaRemoteProvider_url = new WeakMap(), _LambdaRemoteProvider_fetch = new WeakMap(), _LambdaRemoteProvider_headers = new WeakMap(), _LambdaRemoteProvider_instances = new WeakSet(), _LambdaRemoteProvider_post = async function _LambdaRemoteProvider_post(options) {
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
    if (!response.ok) {
        const statusText = response.statusText ? ` ${response.statusText}` : "";
        throw toLambdaError(new Error(`Remote Lambda invoke failed with HTTP ${response.status}${statusText}`), "LAMBDA_PROVIDER_ERROR");
    }
    return response;
}, _LambdaRemoteProvider_parseJsonResponse = async function _LambdaRemoteProvider_parseJsonResponse(response) {
    let payload;
    try {
        payload = await response.json();
    }
    catch (error) {
        throw toLambdaError(new Error(`Remote Lambda invoke returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`), "LAMBDA_PROVIDER_ERROR");
    }
    if (!payload.ok) {
        throw toLambdaError(payload.error, "LAMBDA_PROVIDER_ERROR");
    }
    return payload.response;
}, _LambdaRemoteProvider_readStreamResponse = async function _LambdaRemoteProvider_readStreamResponse(body, observer) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedChunk = false;
    let result;
    let failure;
    const handleLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            return;
        }
        let event;
        try {
            event = JSON.parse(trimmed);
        }
        catch (error) {
            throw toLambdaError(new Error(`Remote Lambda stream returned invalid NDJSON: ${error instanceof Error ? error.message : String(error)}`), "LAMBDA_PROVIDER_ERROR");
        }
        if (event.type === "chunk") {
            receivedChunk = true;
            observer.onChunk({ chunk: event.chunk, textDelta: event.textDelta, firstByteLatency: event.firstByteLatency });
        }
        else if (event.type === "result") {
            result = event.response;
        }
        else if (event.type === "error") {
            failure = event.error;
        }
    };
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            let newlineIndex = buffer.indexOf("\n");
            while (newlineIndex >= 0) {
                handleLine(buffer.slice(0, newlineIndex));
                buffer = buffer.slice(newlineIndex + 1);
                newlineIndex = buffer.indexOf("\n");
            }
        }
        buffer += decoder.decode();
        handleLine(buffer);
    }
    catch (error) {
        await reader.cancel().catch(() => { });
        throw error;
    }
    if (failure) {
        throw toLambdaError(failure, "LAMBDA_PROVIDER_ERROR");
    }
    if (!result) {
        throw toLambdaError(new Error("Remote Lambda stream ended without a result"), "LAMBDA_PROVIDER_ERROR");
    }
    // A server that streamed NDJSON but delivered chunks only in the terminal
    // result (for example, a non-streaming provider behind the streaming
    // handler) still needs its chunks projected to the observer.
    if (!receivedChunk) {
        replayBufferedChunks(result, observer);
    }
    return result;
};
function isNdjson(contentType) {
    return contentType.includes("ndjson") || contentType.includes("jsonl");
}
function replayBufferedChunks(response, observer) {
    (response.chunks ?? []).forEach((chunk, index) => {
        observer.onChunk({
            chunk,
            textDelta: chunk,
            firstByteLatency: index === 0 ? response.firstByteLatency : undefined,
        });
    });
}
//# sourceMappingURL=LambdaRemoteProvider.js.map