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
var _AwsLambdaProvider_instances, _AwsLambdaProvider_invoker, _AwsLambdaProvider_streamInvoker, _AwsLambdaProvider_policy, _AwsLambdaProvider_client, _AwsLambdaProvider_normalizeOptions, _AwsLambdaProvider_resolveFunctionName, _AwsLambdaProvider_resolveQualifier, _AwsLambdaProvider_invokeWithSdk, _AwsLambdaProvider_invokeStreamWithSdk;
import { InvokeCommand, InvokeWithResponseStreamCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { toLambdaError } from "../raiseError.js";
import { clonePinPolicy, resolveFunctionName, resolveLogType, resolveQualifier } from "../pinPolicy.js";
export class AwsLambdaProvider {
    constructor(options = {}) {
        _AwsLambdaProvider_instances.add(this);
        _AwsLambdaProvider_invoker.set(this, void 0);
        _AwsLambdaProvider_streamInvoker.set(this, void 0);
        _AwsLambdaProvider_policy.set(this, void 0);
        _AwsLambdaProvider_client.set(this, void 0);
        __classPrivateFieldSet(this, _AwsLambdaProvider_client, options.sdkClient ?? (options.invoker && options.streamInvoker ? null : new LambdaClient({})), "f");
        __classPrivateFieldSet(this, _AwsLambdaProvider_invoker, options.invoker ?? ((invokeOptions) => __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_invokeWithSdk).call(this, invokeOptions)), "f");
        __classPrivateFieldSet(this, _AwsLambdaProvider_streamInvoker, options.streamInvoker ?? null, "f");
        __classPrivateFieldSet(this, _AwsLambdaProvider_policy, clonePinPolicy(options.policy), "f");
    }
    async invoke(options) {
        const normalizedOptions = __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_normalizeOptions).call(this, options);
        try {
            return await __classPrivateFieldGet(this, _AwsLambdaProvider_invoker, "f").call(this, normalizedOptions);
        }
        catch (error) {
            throw toLambdaError(error, "LAMBDA_PROVIDER_ERROR");
        }
    }
    async invokeStream(options, observer) {
        const normalizedOptions = __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_normalizeOptions).call(this, {
            ...options,
            mode: "stream",
        });
        try {
            return __classPrivateFieldGet(this, _AwsLambdaProvider_streamInvoker, "f")
                ? await __classPrivateFieldGet(this, _AwsLambdaProvider_streamInvoker, "f").call(this, normalizedOptions, observer)
                : await __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_invokeStreamWithSdk).call(this, normalizedOptions, observer);
        }
        catch (error) {
            throw toLambdaError(error, "LAMBDA_PROVIDER_ERROR");
        }
    }
}
_AwsLambdaProvider_invoker = new WeakMap(), _AwsLambdaProvider_streamInvoker = new WeakMap(), _AwsLambdaProvider_policy = new WeakMap(), _AwsLambdaProvider_client = new WeakMap(), _AwsLambdaProvider_instances = new WeakSet(), _AwsLambdaProvider_normalizeOptions = function _AwsLambdaProvider_normalizeOptions(options) {
    const functionName = __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_resolveFunctionName).call(this, options.functionName);
    const qualifier = __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_resolveQualifier).call(this, options.qualifier ?? null);
    const logType = resolveLogType(options.logType, __classPrivateFieldGet(this, _AwsLambdaProvider_policy, "f"));
    return {
        ...options,
        functionName,
        qualifier,
        logType,
    };
}, _AwsLambdaProvider_resolveFunctionName = function _AwsLambdaProvider_resolveFunctionName(requestedValue) {
    return resolveFunctionName(requestedValue, __classPrivateFieldGet(this, _AwsLambdaProvider_policy, "f"));
}, _AwsLambdaProvider_resolveQualifier = function _AwsLambdaProvider_resolveQualifier(requestedValue) {
    return resolveQualifier(requestedValue, __classPrivateFieldGet(this, _AwsLambdaProvider_policy, "f"));
}, _AwsLambdaProvider_invokeWithSdk = async function _AwsLambdaProvider_invokeWithSdk(options) {
    if (!__classPrivateFieldGet(this, _AwsLambdaProvider_client, "f")) {
        throw toLambdaError(new Error("No Lambda client available"), "LAMBDA_CONFIG_ERROR");
    }
    const response = await __classPrivateFieldGet(this, _AwsLambdaProvider_client, "f").send(new InvokeCommand({
        FunctionName: options.functionName,
        Payload: serializePayload(options.payload),
        Qualifier: options.qualifier ?? undefined,
        ClientContext: options.clientContext ?? undefined,
        LogType: options.logType,
    }), {
        abortSignal: options.signal,
    });
    return {
        result: parsePayload(response.Payload),
        statusCode: response.StatusCode ?? null,
        functionError: response.FunctionError ?? null,
        executedVersion: response.ExecutedVersion ?? null,
        requestId: response.$metadata.requestId ?? null,
        logResult: decodeLogResult(response.LogResult ?? null),
    };
}, _AwsLambdaProvider_invokeStreamWithSdk = async function _AwsLambdaProvider_invokeStreamWithSdk(options, observer) {
    if (!__classPrivateFieldGet(this, _AwsLambdaProvider_client, "f")) {
        throw toLambdaError(new Error("No Lambda client available"), "LAMBDA_CONFIG_ERROR");
    }
    const startedAt = now();
    const chunks = [];
    let text = "";
    let firstByteLatency = null;
    let functionError = null;
    let logResult = null;
    const response = await __classPrivateFieldGet(this, _AwsLambdaProvider_client, "f").send(new InvokeWithResponseStreamCommand({
        FunctionName: options.functionName,
        Payload: serializePayload(options.payload),
        Qualifier: options.qualifier ?? undefined,
        ClientContext: options.clientContext ?? undefined,
        LogType: options.logType,
    }), {
        abortSignal: options.signal,
    });
    for await (const event of response.EventStream ?? []) {
        if (options.signal?.aborted) {
            break;
        }
        if (event.PayloadChunk) {
            const chunk = textDecoder.decode(event.PayloadChunk.Payload ?? new Uint8Array());
            if (firstByteLatency === null) {
                firstByteLatency = now() - startedAt;
            }
            chunks.push(chunk);
            text += chunk;
            observer.onChunk({
                chunk,
                textDelta: chunk,
                firstByteLatency,
            });
        }
        if (event.InvokeComplete) {
            functionError = event.InvokeComplete.ErrorCode ?? null;
            logResult = decodeLogResult(event.InvokeComplete.LogResult ?? null);
            if (!text && event.InvokeComplete.ErrorDetails) {
                text = event.InvokeComplete.ErrorDetails;
            }
        }
    }
    return {
        result: parseTextPayload(text),
        statusCode: response.StatusCode ?? null,
        functionError,
        executedVersion: response.ExecutedVersion ?? null,
        requestId: response.$metadata?.requestId ?? null,
        logResult,
        chunks,
        text,
        firstByteLatency,
    };
};
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function serializePayload(payload) {
    if (payload === undefined) {
        return undefined;
    }
    if (payload === null) {
        return textEncoder.encode("null");
    }
    if (payload instanceof Uint8Array) {
        return payload;
    }
    if (typeof payload === "string") {
        return textEncoder.encode(payload);
    }
    return textEncoder.encode(JSON.stringify(payload));
}
function parsePayload(payload) {
    if (!payload || payload.byteLength === 0) {
        return null;
    }
    return parseTextPayload(textDecoder.decode(payload));
}
function parseTextPayload(text) {
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
function decodeLogResult(logResult) {
    if (!logResult) {
        return null;
    }
    const nodeBuffer = Reflect.get(globalThis, "Buffer");
    if (nodeBuffer) {
        return nodeBuffer.from(logResult, "base64").toString("utf8");
    }
    if (typeof atob !== "undefined") {
        return atob(logResult);
    }
    return logResult;
}
function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
}
//# sourceMappingURL=AwsLambdaProvider.js.map