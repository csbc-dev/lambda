import { toLambdaError } from "../raiseError.js";
export function createLambdaRemoteHandler(coreSource, options = {}) {
    let sharedCoreBusy = false;
    return async (request) => {
        if (request.method !== "POST") {
            return Response.json(remoteError(new Error("Method not allowed"), "LAMBDA_CONFIG_ERROR"), { status: 405 });
        }
        try {
            if (options.authenticate && !await options.authenticate(request)) {
                return Response.json(remoteError(new Error("Unauthorized"), "LAMBDA_AUTH_ERROR"), { status: 401 });
            }
        }
        catch (error) {
            return Response.json(remoteError(error, "LAMBDA_AUTH_ERROR"), { status: 500 });
        }
        let body;
        try {
            body = await request.json();
        }
        catch (error) {
            return Response.json(remoteError(error, "LAMBDA_INPUT_ERROR"), { status: 400 });
        }
        if (!isLambdaRemoteInvokeRequest(body)) {
            return Response.json(remoteError(new Error("Unsupported Lambda remote command"), "LAMBDA_INPUT_ERROR"), { status: 400 });
        }
        let core;
        try {
            core = typeof coreSource === "function" ? await coreSource(request) : coreSource;
        }
        catch (error) {
            return Response.json(remoteError(error, "LAMBDA_CONFIG_ERROR"), { status: 500 });
        }
        if (typeof coreSource !== "function") {
            if (sharedCoreBusy) {
                return Response.json(remoteError(new Error("Shared LambdaCore is already handling an invocation; pass a Core factory for concurrent requests"), "LAMBDA_CONFIG_ERROR"), { status: 409 });
            }
            sharedCoreBusy = true;
        }
        let response;
        try {
            const invokePromise = core.invoke(body.options);
            response = typeof coreSource === "function"
                ? await invokePromise
                : await withSharedCoreTimeout(core, invokePromise, options.sharedCoreTimeoutMs ?? 300000);
        }
        catch (error) {
            return Response.json(remoteError(error, "LAMBDA_INVOKE_FAILED"), { status: isTimeoutError(error) ? 504 : 500 });
        }
        finally {
            if (typeof coreSource !== "function") {
                sharedCoreBusy = false;
            }
        }
        if (!response) {
            return Response.json({
                ok: false,
                error: core.error ?? toLambdaError(new Error("Remote Lambda invocation failed"), "LAMBDA_INVOKE_FAILED"),
            }, { status: 400 });
        }
        return Response.json({
            ok: true,
            response,
        });
    };
}
async function withSharedCoreTimeout(core, invokePromise, timeoutMs) {
    if (timeoutMs <= 0) {
        return invokePromise;
    }
    let timeoutId;
    const timeoutPromise = new Promise((_resolve, reject) => {
        timeoutId = setTimeout(() => {
            core.abort();
            reject(new LambdaRemoteTimeoutError(`Shared LambdaCore invocation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    try {
        return await Promise.race([invokePromise, timeoutPromise]);
    }
    finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
}
class LambdaRemoteTimeoutError extends Error {
}
function isTimeoutError(error) {
    return error instanceof LambdaRemoteTimeoutError;
}
function isLambdaRemoteInvokeRequest(value) {
    if (!isRecord(value) || value.command !== "invoke" || !isRecord(value.options)) {
        return false;
    }
    const { options } = value;
    return hasString(options, "functionName")
        && hasOptionalStringOrNull(options, "qualifier")
        && hasOptionalStringOrNull(options, "clientContext")
        && hasOptionalLogType(options)
        && hasOptionalMode(options);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasString(value, key) {
    return typeof value[key] === "string";
}
function hasOptionalStringOrNull(value, key) {
    return value[key] === undefined || value[key] === null || typeof value[key] === "string";
}
function hasOptionalLogType(value) {
    return value.logType === undefined || value.logType === "None" || value.logType === "Tail";
}
function hasOptionalMode(value) {
    return value.mode === undefined || value.mode === "buffered" || value.mode === "stream";
}
function remoteError(error, code) {
    return {
        ok: false,
        error: toLambdaError(error, code),
    };
}
//# sourceMappingURL=createLambdaRemoteHandler.js.map