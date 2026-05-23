import { toLambdaError } from "./raiseError.js";
import type { LambdaPinPolicy } from "./types.js";

export function clonePinPolicy(policy?: LambdaPinPolicy | null): LambdaPinPolicy {
  if (!policy) {
    return {};
  }

  return {
    ...policy,
    allowedFunctionNames: policy.allowedFunctionNames ? [...policy.allowedFunctionNames] : undefined,
    allowedQualifiers: policy.allowedQualifiers ? [...policy.allowedQualifiers] : undefined,
  };
}

export function resolveFunctionName(requestedValue: string, policy: LambdaPinPolicy): string {
  const {
    pinnedFunctionName,
    allowFunctionNameOverride = false,
    allowedFunctionNames,
  } = policy;

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

export function resolveQualifier(requestedValue: string | null, policy: LambdaPinPolicy): string | null {
  const {
    pinnedQualifier,
    allowQualifierOverride = false,
    allowedQualifiers,
  } = policy;

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