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
var _AwsLambdaProvider_instances, _AwsLambdaProvider_invoker, _AwsLambdaProvider_policy, _AwsLambdaProvider_normalizeOptions, _AwsLambdaProvider_resolveFunctionName, _AwsLambdaProvider_resolveQualifier;
import { toLambdaError } from "../raiseError.js";
export class AwsLambdaProvider {
    constructor(options) {
        _AwsLambdaProvider_instances.add(this);
        _AwsLambdaProvider_invoker.set(this, void 0);
        _AwsLambdaProvider_policy.set(this, void 0);
        __classPrivateFieldSet(this, _AwsLambdaProvider_invoker, options.invoker, "f");
        __classPrivateFieldSet(this, _AwsLambdaProvider_policy, options.policy ?? {}, "f");
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
}
_AwsLambdaProvider_invoker = new WeakMap(), _AwsLambdaProvider_policy = new WeakMap(), _AwsLambdaProvider_instances = new WeakSet(), _AwsLambdaProvider_normalizeOptions = function _AwsLambdaProvider_normalizeOptions(options) {
    const functionName = __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_resolveFunctionName).call(this, options.functionName);
    const qualifier = __classPrivateFieldGet(this, _AwsLambdaProvider_instances, "m", _AwsLambdaProvider_resolveQualifier).call(this, options.qualifier ?? null);
    return {
        ...options,
        functionName,
        qualifier,
    };
}, _AwsLambdaProvider_resolveFunctionName = function _AwsLambdaProvider_resolveFunctionName(requestedValue) {
    const { pinnedFunctionName, allowFunctionNameOverride = false, allowedFunctionNames, } = __classPrivateFieldGet(this, _AwsLambdaProvider_policy, "f");
    if (pinnedFunctionName) {
        if (allowFunctionNameOverride && requestedValue && requestedValue !== pinnedFunctionName) {
            throw new Error("Pinned functionName cannot be overridden");
        }
        return pinnedFunctionName;
    }
    if (!requestedValue) {
        throw toLambdaError(new Error("functionName is required"), "LAMBDA_INPUT_ERROR");
    }
    if (allowedFunctionNames && !allowedFunctionNames.includes(requestedValue)) {
        throw toLambdaError(new Error("functionName is not allowed by provider policy"), "LAMBDA_POLICY_DENIED");
    }
    return requestedValue;
}, _AwsLambdaProvider_resolveQualifier = function _AwsLambdaProvider_resolveQualifier(requestedValue) {
    const { pinnedQualifier, allowQualifierOverride = false, allowedQualifiers, } = __classPrivateFieldGet(this, _AwsLambdaProvider_policy, "f");
    if (pinnedQualifier !== undefined) {
        if (allowQualifierOverride && requestedValue !== null && requestedValue !== pinnedQualifier) {
            throw toLambdaError(new Error("Pinned qualifier cannot be overridden"), "LAMBDA_POLICY_DENIED");
        }
        return pinnedQualifier;
    }
    if (requestedValue === null) {
        return null;
    }
    if (allowedQualifiers && !allowedQualifiers.includes(requestedValue)) {
        throw toLambdaError(new Error("qualifier is not allowed by provider policy"), "LAMBDA_POLICY_DENIED");
    }
    return requestedValue;
};
//# sourceMappingURL=AwsLambdaProvider.js.map