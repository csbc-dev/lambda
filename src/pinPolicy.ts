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

export function resolveLogType(
  requestedValue: "None" | "Tail" | undefined,
  policy: LambdaPinPolicy,
): "None" | "Tail" {
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

export function resolveQualifier(requestedValue: string | null, policy: LambdaPinPolicy): string | null {
  const {
    pinnedQualifier,
    allowQualifierOverride = false,
    allowedQualifiers,
  } = policy;

  // Treat an empty/whitespace-only requested qualifier as "not specified" (null)
  // rather than a literal value. A declarative `<lambda-invoke qualifier="">`
  // would otherwise resolve to "" and be forwarded to the SDK as `Qualifier: ""`,
  // which AWS Lambda rejects. `??` keeps "" (it is not null/undefined), so this
  // explicit normalization is required.
  const normalizedRequest = requestedValue !== null && requestedValue.trim() === ""
    ? null
    : requestedValue;

  if (pinnedQualifier !== undefined && !allowQualifierOverride) {
    return pinnedQualifier;
  }

  const resolvedValue = normalizedRequest ?? pinnedQualifier ?? null;

  if (resolvedValue === null) {
    return null;
  }

  if (allowedQualifiers && !allowedQualifiers.includes(resolvedValue)) {
    throw toLambdaError(new Error("qualifier is not allowed by policy"), "LAMBDA_POLICY_DENIED");
  }

  return resolvedValue;
}