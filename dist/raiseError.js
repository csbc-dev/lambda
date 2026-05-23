export function toLambdaError(error, code = "LAMBDA_ERROR") {
    if (isLambdaError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return {
            code,
            message: error.message,
            cause: error,
        };
    }
    if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
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
export function raiseError(target, eventName, error, code) {
    const normalized = toLambdaError(error, code);
    target.dispatchEvent(new CustomEvent(eventName, { detail: normalized }));
    return normalized;
}
function isLambdaError(error) {
    return typeof error === "object"
        && error !== null
        && "code" in error
        && isLambdaErrorCode(error.code)
        && "message" in error
        && typeof error.message === "string";
}
function isLambdaErrorCode(value) {
    return typeof value === "string" && lambdaErrorCodes.has(value);
}
const lambdaErrorCodes = new Set([
    "LAMBDA_ERROR",
    "LAMBDA_ABORTED",
    "LAMBDA_AUTH_ERROR",
    "LAMBDA_CONFIG_ERROR",
    "LAMBDA_INPUT_ERROR",
    "LAMBDA_PARENT_REQUIRED",
    "LAMBDA_POLICY_DENIED",
    "LAMBDA_PROVIDER_ERROR",
    "LAMBDA_FUNCTION_ERROR",
    "LAMBDA_INVOKE_FAILED",
]);
//# sourceMappingURL=raiseError.js.map