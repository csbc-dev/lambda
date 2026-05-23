import { toLambdaError } from "../raiseError.js";
const NDJSON_CONTENT_TYPE = "application/x-ndjson";
export function createLambdaRemoteHandler(coreSource, options = {}) {
    let sharedCoreBusy = false;
    const isSharedCore = typeof coreSource !== "function";
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
        if (isSharedCore) {
            if (sharedCoreBusy) {
                return Response.json(remoteError(new Error("Shared LambdaCore is already handling an invocation; pass a Core factory for concurrent requests"), "LAMBDA_CONFIG_ERROR"), { status: 409 });
            }
            sharedCoreBusy = true;
        }
        // Idempotent, single-owner release of the shared-core lock. The stream path
        // can reach release from two directions — the ReadableStream `start` finally
        // and a consumer-triggered `cancel()` (and the timeout path aborts then the
        // finally runs) — so a naive `sharedCoreBusy = false` could fire twice. The
        // second firing would clear a lock a *different*, newer request has since
        // acquired, letting two requests run against the shared Core at once. The
        // `released` flag scopes the release to this request: only the first call
        // frees the lock; later calls are no-ops.
        let released = false;
        const releaseSharedCore = () => {
            if (!isSharedCore || released) {
                return;
            }
            released = true;
            sharedCoreBusy = false;
        };
        const timeoutMs = options.sharedCoreTimeoutMs ?? 300000;
        // Stream mode returns an NDJSON body so chunks reach the browser as the
        // Lambda response streams in, instead of being buffered into one JSON
        // response and replayed after completion.
        if (body.options.mode === "stream") {
            return streamInvocation(core, body.options, {
                isSharedCore,
                timeoutMs,
                releaseSharedCore,
            });
        }
        let response;
        try {
            const invokePromise = core.invoke(body.options);
            response = isSharedCore
                ? await withSharedCoreTimeout(core, invokePromise, timeoutMs)
                : await invokePromise;
        }
        catch (error) {
            return Response.json(remoteError(error, "LAMBDA_INVOKE_FAILED"), { status: isTimeoutError(error) ? 504 : 500 });
        }
        finally {
            releaseSharedCore();
        }
        if (!response) {
            return Response.json({
                ok: false,
                error: toWireError(core.error ?? new Error("Remote Lambda invocation failed"), "LAMBDA_INVOKE_FAILED"),
            }, { status: 400 });
        }
        return Response.json({
            ok: true,
            response,
        });
    };
}
function streamInvocation(core, options, context) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            let open = true;
            const write = (event) => {
                if (!open) {
                    return;
                }
                try {
                    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
                }
                catch {
                    // Consumer cancelled; stop trying to write.
                    open = false;
                }
            };
            try {
                const invokePromise = core.invoke(options, {
                    onChunk: (chunk) => write({
                        type: "chunk",
                        chunk: chunk.chunk,
                        textDelta: chunk.textDelta,
                        firstByteLatency: chunk.firstByteLatency,
                    }),
                });
                const response = context.isSharedCore
                    ? await withSharedCoreTimeout(core, invokePromise, context.timeoutMs)
                    : await invokePromise;
                if (!response) {
                    write({ type: "error", error: toWireError(core.error ?? new Error("Remote Lambda invocation failed"), "LAMBDA_INVOKE_FAILED") });
                }
                else {
                    write({ type: "result", response });
                }
            }
            catch (error) {
                write({ type: "error", error: toWireError(error, "LAMBDA_INVOKE_FAILED") });
            }
            finally {
                context.releaseSharedCore();
                if (open) {
                    try {
                        controller.close();
                    }
                    catch {
                        // Already closed by a cancel.
                    }
                }
            }
        },
        cancel() {
            // The consumer (browser) disconnected mid-stream. Abort the in-flight
            // invocation so the Core stops forwarding and the shared lock is freed.
            core.abort();
            context.releaseSharedCore();
        },
    });
    return new Response(stream, {
        status: 200,
        headers: { "content-type": NDJSON_CONTENT_TYPE },
    });
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
        error: toWireError(error, code),
    };
}
/**
 * Normalize an error for transmission across the network boundary, dropping
 * `cause`. `toLambdaError` keeps the original throwable on `cause` for server-side
 * logging, but the privileged runtime must NOT serialize it to the browser:
 * AWS SDK v3 errors are Error subclasses carrying enumerable `$metadata` /
 * `$fault` / `$response` properties that JSON.stringify would leak (function
 * ARN, region, request internals). SPEC 13/10.1 require that raw provider
 * errors stay server-side. Only the normalized `{ code, message }` crosses the
 * wire — in both the buffered JSON response and the NDJSON `error` event.
 */
function toWireError(error, code) {
    const normalized = toLambdaError(error, code);
    return { code: normalized.code, message: normalized.message };
}
//# sourceMappingURL=createLambdaRemoteHandler.js.map