import { toLambdaError } from "./raiseError.js";
export function clonePinPolicy(policy) {
    if (!policy) {
        return {};
    }
    return {
        ...policy,
        allowedFunctionNames: policy.allowedFunctionNames ? [...policy.allowedFunctionNames] : undefined,
        allowedQualifiers: policy.allowedQualifiers ? [...policy.allowedQualifiers] : undefined,
    };
}
export function resolveFunctionName(requestedValue, policy) {
    const { pinnedFunctionName, allowFunctionNameOverride = false, allowedFunctionNames, } = policy;
    if (pinnedFunctionName && !allowFunctionNameOverride) {
        return pinnedFunctionName;
    }
    const resolvedValue = requestedValue || pinnedFunctionName || "";
    if (!resolvedValue) {
        throw toLambdaError(new Error("functionName is required"), "LAMBDA_INPUT_ERROR");
    }
    if (allowedFunctionNames && !allowedFunctionNames.includes(resolvedValue)) {
        throw toLambdaError(new Error("functionName is not allowed by policy"), "LAMBDA_POLICY_DENIED");
    }
    return resolvedValue;
}
export function resolveLogType(requestedValue, policy) {
    const { pinnedLogType, allowLogTypeOverride = false } = policy;
    // `Tail` returns the last 4 KB of the function's execution log, which can
    // leak runtime environment details. When the server pins a log type and does
    // not opt into override, the client's request is ignored — the same posture
    // used for functionName and qualifier (see SPEC 10.4).
    if (pinnedLogType !== undefined && !allowLogTypeOverride) {
        return pinnedLogType;
    }
    return requestedValue ?? pinnedLogType ?? "None";
}
export function resolveQualifier(requestedValue, policy) {
    const { pinnedQualifier, allowQualifierOverride = false, allowedQualifiers, } = policy;
    if (pinnedQualifier !== undefined && !allowQualifierOverride) {
        return pinnedQualifier;
    }
    const resolvedValue = requestedValue ?? pinnedQualifier ?? null;
    if (resolvedValue === null) {
        return null;
    }
    if (allowedQualifiers && !allowedQualifiers.includes(resolvedValue)) {
        throw toLambdaError(new Error("qualifier is not allowed by policy"), "LAMBDA_POLICY_DENIED");
    }
    return resolvedValue;
}
//# sourceMappingURL=pinPolicy.js.map