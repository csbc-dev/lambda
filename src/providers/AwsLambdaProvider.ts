import { InvokeCommand, InvokeWithResponseStreamCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { toLambdaError } from "../raiseError.js";
import { clonePinPolicy, resolveFunctionName, resolveQualifier } from "../pinPolicy.js";
import type {
  AwsLambdaProviderOptions,
  ILambdaProvider,
  LambdaInvokeOptions,
  LambdaInvokeResponse,
  LambdaInvoker,
  LambdaPinPolicy,
  LambdaSdkClientLike,
  LambdaStreamInvoker,
  LambdaStreamObserver,
} from "../types.js";

export class AwsLambdaProvider implements ILambdaProvider {
  #invoker: LambdaInvoker;
  #streamInvoker: LambdaStreamInvoker | null;
  #policy: LambdaPinPolicy;
  #client: LambdaSdkClientLike | null;

  constructor(options: AwsLambdaProviderOptions = {}) {
    this.#client = options.sdkClient ?? (options.invoker && options.streamInvoker ? null : new LambdaClient({}));
    this.#invoker = options.invoker ?? ((invokeOptions) => this.#invokeWithSdk(invokeOptions));
    this.#streamInvoker = options.streamInvoker ?? null;
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

  async invokeStream(options: LambdaInvokeOptions, observer: LambdaStreamObserver): Promise<LambdaInvokeResponse> {
    const normalizedOptions = this.#normalizeOptions({
      ...options,
      mode: "stream",
    });

    try {
      return this.#streamInvoker
        ? await this.#streamInvoker(normalizedOptions, observer)
        : await this.#invokeStreamWithSdk(normalizedOptions, observer);
    } catch (error) {
      throw toLambdaError(error, "LAMBDA_PROVIDER_ERROR");
    }
  }

  #normalizeOptions(options: LambdaInvokeOptions): LambdaInvokeOptions {
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
    }), {
      abortSignal: options.signal,
    }) as {
      Payload?: Uint8Array;
      StatusCode?: number;
      FunctionError?: string;
      ExecutedVersion?: string;
      LogResult?: string;
      $metadata: { requestId?: string };
    };

    return {
      result: parsePayload(response.Payload),
      statusCode: response.StatusCode ?? null,
      functionError: response.FunctionError ?? null,
      executedVersion: response.ExecutedVersion ?? null,
      requestId: response.$metadata.requestId ?? null,
      logResult: decodeLogResult(response.LogResult ?? null),
    };
  }

  async #invokeStreamWithSdk(options: LambdaInvokeOptions, observer: LambdaStreamObserver): Promise<LambdaInvokeResponse> {
    if (!this.#client) {
      throw toLambdaError(new Error("No Lambda client available"), "LAMBDA_CONFIG_ERROR");
    }

    const startedAt = now();
    const chunks: string[] = [];
    let text = "";
    let firstByteLatency: number | null = null;
    let functionError: string | null = null;
    let logResult: string | null = null;

    const response = await this.#client.send(new InvokeWithResponseStreamCommand({
      FunctionName: options.functionName,
      Payload: serializePayload(options.payload),
      Qualifier: options.qualifier ?? undefined,
      ClientContext: options.clientContext ?? undefined,
      LogType: options.logType,
    }), {
      abortSignal: options.signal,
    }) as {
      StatusCode?: number;
      ExecutedVersion?: string;
      EventStream?: AsyncIterable<{
        PayloadChunk?: { Payload?: Uint8Array };
        InvokeComplete?: { ErrorCode?: string; ErrorDetails?: string; LogResult?: string };
      }>;
      $metadata?: { requestId?: string };
    };

    for await (const event of response.EventStream ?? []) {
      if (options.signal?.aborted) {
        break;
      }

      if (event.PayloadChunk) {
        const chunk = textDecoder.decode(event.PayloadChunk.Payload ?? new Uint8Array());
        if (firstByteLatency === null) {
          firstByteLatency = now() - startedAt;
        }

        chunks.push(chunk);
        text += chunk;
        observer.onChunk({
          chunk,
          textDelta: chunk,
          firstByteLatency,
        });
      }

      if (event.InvokeComplete) {
        functionError = event.InvokeComplete.ErrorCode ?? null;
        logResult = decodeLogResult(event.InvokeComplete.LogResult ?? null);
        if (!text && event.InvokeComplete.ErrorDetails) {
          text = event.InvokeComplete.ErrorDetails;
        }
      }
    }

    return {
      result: parseTextPayload(text),
      statusCode: response.StatusCode ?? null,
      functionError,
      executedVersion: response.ExecutedVersion ?? null,
      requestId: response.$metadata?.requestId ?? null,
      logResult,
      chunks,
      text,
      firstByteLatency,
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

  return parseTextPayload(textDecoder.decode(payload));
}

function parseTextPayload(text: string): unknown {
  if (!text) {
    return null;
  }

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

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}