import { toLambdaError } from "../raiseError.js";
import type { LambdaCore } from "../core/LambdaCore.js";
import type { LambdaInvokeOptions, LambdaRemoteInvokeRequest, LambdaRemoteInvokeResponse } from "../types.js";

export type LambdaRemoteHandler = (request: Request) => Promise<Response>;

export function createLambdaRemoteHandler(core: LambdaCore): LambdaRemoteHandler {
  return async (request) => {
    if (request.method !== "POST") {
      return Response.json(remoteError(new Error("Method not allowed"), "LAMBDA_CONFIG_ERROR"), { status: 405 });
    }

    let body: LambdaRemoteInvokeRequest;

    try {
      body = await request.json() as LambdaRemoteInvokeRequest;
    } catch (error) {
      return Response.json(remoteError(error, "LAMBDA_INPUT_ERROR"), { status: 400 });
    }

    if (body.command !== "invoke") {
      return Response.json(remoteError(new Error("Unsupported Lambda remote command"), "LAMBDA_INPUT_ERROR"), { status: 400 });
    }

    const response = await core.invoke(body.options as Partial<LambdaInvokeOptions>);

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

function remoteError(error: unknown, code: Parameters<typeof toLambdaError>[1]): LambdaRemoteInvokeResponse {
  return {
    ok: false,
    error: toLambdaError(error, code),
  };
}