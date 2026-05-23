import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { toLambdaError } from "../raiseError.js";
import { clonePinPolicy, resolveFunctionName, resolveQualifier } from "../pinPolicy.js";
import type {
  AwsLambdaProviderOptions,
  ILambdaProvider,
  LambdaInvokeOptions,
  LambdaInvokeResponse,
  LambdaInvoker,
  LambdaPinPolicy,
} from "../types.js";

export class AwsLambdaProvider implements ILambdaProvider {
  #invoker: LambdaInvoker;
  #policy: LambdaPinPolicy;
  #client: LambdaClient | null;

  constructor(options: AwsLambdaProviderOptions = {}) {
    this.#client = options.invoker ? null : new LambdaClient({});
    this.#invoker = options.invoker ?? ((invokeOptions) => this.#invokeWithSdk(invokeOptions));
    this.#policy = clonePinPolicy(options.policy);
  }

  async invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse> {
    const normalizedOptions = this.#normalizeOptions(options);

    try {
      return await this.#invoker(normalizedOptions);
    } catch (error) {
      throw toLambdaError(error, "LAMBDA_PROVIDER_ERROR");
    }
  }

  #normalizeOptions(options: LambdaInvokeOptions): LambdaInvokeOptions {
    if (options.mode === "stream") {
      throw toLambdaError(
        new Error("AwsLambdaProvider does not implement stream mode yet; add a stream transport path first"),
        "LAMBDA_CONFIG_ERROR",
      );
    }

    const functionName = this.#resolveFunctionName(options.functionName);
    const qualifier = this.#resolveQualifier(options.qualifier ?? null);

    return {
      ...options,
      functionName,
      qualifier,
    };
  }

  #resolveFunctionName(requestedValue: string): string {
    return resolveFunctionName(requestedValue, this.#policy);
  }

  #resolveQualifier(requestedValue: string | null): string | null {
    return resolveQualifier(requestedValue, this.#policy);
  }

  async #invokeWithSdk(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse> {
    if (!this.#client) {
      throw toLambdaError(new Error("No Lambda client available"), "LAMBDA_CONFIG_ERROR");
    }

    const response = await this.#client.send(new InvokeCommand({
      FunctionName: options.functionName,
      Payload: serializePayload(options.payload),
      Qualifier: options.qualifier ?? undefined,
      ClientContext: options.clientContext ?? undefined,
      LogType: options.logType,
    }));

    return {
      result: parsePayload(response.Payload),
      statusCode: response.StatusCode ?? null,
      functionError: response.FunctionError ?? null,
      executedVersion: response.ExecutedVersion ?? null,
      requestId: response.$metadata.requestId ?? null,
      logResult: decodeLogResult(response.LogResult ?? null),
    };
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function serializePayload(payload: unknown): Uint8Array | undefined {
  if (payload === undefined) {
    return undefined;
  }

  if (payload === null) {
    return textEncoder.encode("null");
  }

  if (payload instanceof Uint8Array) {
    return payload;
  }

  if (typeof payload === "string") {
    return textEncoder.encode(payload);
  }

  return textEncoder.encode(JSON.stringify(payload));
}

function parsePayload(payload: Uint8Array | undefined): unknown {
  if (!payload || payload.byteLength === 0) {
    return null;
  }

  const text = textDecoder.decode(payload);

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function decodeLogResult(logResult: string | null): string | null {
  if (!logResult) {
    return null;
  }

  const nodeBuffer = Reflect.get(globalThis as object, "Buffer") as {
    from(input: string, encoding: string): { toString(encoding: string): string };
  } | undefined;

  if (nodeBuffer) {
    return nodeBuffer.from(logResult, "base64").toString("utf8");
  }

  if (typeof atob !== "undefined") {
    return atob(logResult);
  }

  return logResult;
}