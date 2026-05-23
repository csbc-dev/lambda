import { toLambdaError } from "../raiseError.js";
export function createLambdaRemoteHandler(core) {
    return async (request) => {
        if (request.method !== "POST") {
            return Response.json(remoteError(new Error("Method not allowed"), "LAMBDA_CONFIG_ERROR"), { status: 405 });
        }
        let body;
        try {
            body = await request.json();
        }
        catch (error) {
            return Response.json(remoteError(error, "LAMBDA_INPUT_ERROR"), { status: 400 });
        }
        if (body.command !== "invoke") {
            return Response.json(remoteError(new Error("Unsupported Lambda remote command"), "LAMBDA_INPUT_ERROR"), { status: 400 });
        }
        const response = await core.invoke(body.options);
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
function remoteError(error, code) {
    return {
        ok: false,
        error: toLambdaError(error, code),
    };
}
//# sourceMappingURL=createLambdaRemoteHandler.js.map