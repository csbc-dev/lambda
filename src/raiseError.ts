import type { LambdaError } from "./types.js";

export function toLambdaError(error: unknown, code = "LAMBDA_ERROR"): LambdaError {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    return error as LambdaError;
  }

  if (error instanceof Error) {
    return {
      code,
      message: error.message,
      cause: error,
    };
  }

  return {
    code,
    message: String(error),
    cause: error,
  };
}

export function raiseError(target: EventTarget, eventName: string, error: unknown, code?: string): LambdaError {
  const normalized = toLambdaError(error, code);
  target.dispatchEvent(new CustomEvent(eventName, { detail: normalized }));
  return normalized;
}