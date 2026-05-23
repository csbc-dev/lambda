import { toLambdaError } from "../raiseError.js";
import type { LambdaCore } from "../core/LambdaCore.js";
import type { LambdaInvokeOptions, LambdaInvokeResponse, LambdaRemoteInvokeRequest, LambdaRemoteInvokeResponse, LambdaRemoteStreamEvent } from "../types.js";

export type LambdaRemoteHandler = (request: Request) => Promise<Response>;
export type LambdaRemoteCoreSource = LambdaCore | ((request: Request) => LambdaCore | Promise<LambdaCore>);
export interface LambdaRemoteHandlerOptions {
  authenticate?: (request: Request) => boolean | Promise<boolean>;
  sharedCoreTimeoutMs?: number;
}

const NDJSON_CONTENT_TYPE = "application/x-ndjson";

export function createLambdaRemoteHandler(coreSource: LambdaRemoteCoreSource, options: LambdaRemoteHandlerOptions = {}): LambdaRemoteHandler {
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
    } catch (error) {
      return Response.json(remoteError(error, "LAMBDA_AUTH_ERROR"), { status: 500 });
    }

    let body: LambdaRemoteInvokeRequest;

    try {
      body = await request.json() as LambdaRemoteInvokeRequest;
    } catch (error) {
      return Response.json(remoteError(error, "LAMBDA_INPUT_ERROR"), { status: 400 });
    }

    if (!isLambdaRemoteInvokeRequest(body)) {
      return Response.json(remoteError(new Error("Unsupported Lambda remote command"), "LAMBDA_INPUT_ERROR"), { status: 400 });
    }

    let core: LambdaCore;

    try {
      core = typeof coreSource === "function" ? await coreSource(request) : coreSource;
    } catch (error) {
      return Response.json(remoteError(error, "LAMBDA_CONFIG_ERROR"), { status: 500 });
    }

    if (isSharedCore) {
      if (sharedCoreBusy) {
        return Response.json(remoteError(new Error("Shared LambdaCore is already handling an invocation; pass a Core factory for concurrent requests"), "LAMBDA_CONFIG_ERROR"), { status: 409 });
      }

      sharedCoreBusy = true;
    }

    const releaseSharedCore = () => {
      if (isSharedCore) {
        sharedCoreBusy = false;
      }
    };
    const timeoutMs = options.sharedCoreTimeoutMs ?? 300_000;

    // Stream mode returns an NDJSON body so chunks reach the browser as the
    // Lambda response streams in, instead of being buffered into one JSON
    // response and replayed after completion.
    if (body.options.mode === "stream") {
      return streamInvocation(core, body.options as Partial<LambdaInvokeOptions>, {
        isSharedCore,
        timeoutMs,
        releaseSharedCore,
      });
    }

    let response;

    try {
      const invokePromise = core.invoke(body.options as Partial<LambdaInvokeOptions>);
      response = isSharedCore
        ? await withSharedCoreTimeout(core, invokePromise, timeoutMs)
        : await invokePromise;
    } catch (error) {
      return Response.json(remoteError(error, "LAMBDA_INVOKE_FAILED"), { status: isTimeoutError(error) ? 504 : 500 });
    } finally {
      releaseSharedCore();
    }

    if (!response) {
      return Response.json({
        ok: false,
        error: core.error ?? toLambdaError(new Error("Remote Lambda invocation failed"), "LAMBDA_INVOKE_FAILED"),
      } satisfies LambdaRemoteInvokeResponse, { status: 400 });
    }

    return Response.json({
      ok: true,
      response,
    } satisfies LambdaRemoteInvokeResponse);
  };
}

interface StreamInvocationContext {
  isSharedCore: boolean;
  timeoutMs: number;
  releaseSharedCore: () => void;
}

function streamInvocation(core: LambdaCore, options: Partial<LambdaInvokeOptions>, context: StreamInvocationContext): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const write = (event: LambdaRemoteStreamEvent): void => {
        if (!open) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
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
          write({ type: "error", error: core.error ?? toLambdaError(new Error("Remote Lambda invocation failed"), "LAMBDA_INVOKE_FAILED") });
        } else {
          write({ type: "result", response });
        }
      } catch (error) {
        write({ type: "error", error: toLambdaError(error, "LAMBDA_INVOKE_FAILED") });
      } finally {
        context.releaseSharedCore();
        if (open) {
          try {
            controller.close();
          } catch {
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

async function withSharedCoreTimeout(
  core: LambdaCore,
  invokePromise: Promise<LambdaInvokeResponse | undefined>,
  timeoutMs: number,
): Promise<LambdaInvokeResponse | undefined> {
  if (timeoutMs <= 0) {
    return invokePromise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      core.abort();
      reject(new LambdaRemoteTimeoutError(`Shared LambdaCore invocation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([invokePromise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

class LambdaRemoteTimeoutError extends Error {}

function isTimeoutError(error: unknown): boolean {
  return error instanceof LambdaRemoteTimeoutError;
}

function isLambdaRemoteInvokeRequest(value: unknown): value is LambdaRemoteInvokeRequest {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

function hasOptionalStringOrNull(value: Record<string, unknown>, key: string): boolean {
  return value[key] === undefined || value[key] === null || typeof value[key] === "string";
}

function hasOptionalLogType(value: Record<string, unknown>): boolean {
  return value.logType === undefined || value.logType === "None" || value.logType === "Tail";
}

function hasOptionalMode(value: Record<string, unknown>): boolean {
  return value.mode === undefined || value.mode === "buffered" || value.mode === "stream";
}

function remoteError(error: unknown, code: Parameters<typeof toLambdaError>[1]): LambdaRemoteInvokeResponse {
  return {
    ok: false,
    error: toLambdaError(error, code),
  };
}