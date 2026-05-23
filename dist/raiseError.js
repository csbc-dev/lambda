export function toLambdaError(error, code = "LAMBDA_ERROR") {
    if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
        return error;
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
export function raiseError(target, eventName, error, code) {
    const normalized = toLambdaError(error, code);
    target.dispatchEvent(new CustomEvent(eventName, { detail: normalized }));
    return normalized;
}
//# sourceMappingURL=raiseError.js.map