import { toLambdaError } from "../raiseError.js";
import type {
  ILambdaProvider,
  LambdaInvokeOptions,
  LambdaInvokeResponse,
  LambdaRemoteInvokeRequest,
  LambdaRemoteInvokeResponse,
  LambdaRemoteProviderOptions,
  LambdaStreamObserver,
} from "../types.js";

export class LambdaRemoteProvider implements ILambdaProvider {
  #url: string;
  #fetch: typeof fetch;
  #headers: HeadersInit;

  constructor(options: LambdaRemoteProviderOptions) {
    if (!options.url) {
      throw toLambdaError(new Error("Remote Lambda core URL is required"), "LAMBDA_CONFIG_ERROR");
    }

    this.#url = options.url;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#headers = options.headers ?? {};

    if (!this.#fetch) {
      throw toLambdaError(new Error("fetch is not available for LambdaRemoteProvider"), "LAMBDA_CONFIG_ERROR");
    }
  }

  async invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse> {
    return this.#sendInvoke(options);
  }

  async invokeStream(options: LambdaInvokeOptions, observer: LambdaStreamObserver): Promise<LambdaInvokeResponse> {
    const response = await this.#sendInvoke({
      ...options,
      mode: "stream",
    });

    // The fetch remote transport returns one JSON response, so stream chunks are replayed after the server invocation completes.
    for (const [index, chunk] of (response.chunks ?? []).entries()) {
      observer.onChunk({
        chunk,
        textDelta: chunk,
        firstByteLatency: index === 0 ? response.firstByteLatency : undefined,
      });
    }

    return response;
  }

  async #sendInvoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse> {
    const { signal, ...serializableOptions } = options;
    const body = {
      command: "invoke",
      options: serializableOptions,
    } satisfies LambdaRemoteInvokeRequest;

    const response = await this.#fetch(this.#url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.#headers,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const statusText = response.statusText ? ` ${response.statusText}` : "";
      throw toLambdaError(new Error(`Remote Lambda invoke failed with HTTP ${response.status}${statusText}`), "LAMBDA_PROVIDER_ERROR");
    }

    let payload: LambdaRemoteInvokeResponse;

    try {
      payload = await response.json() as LambdaRemoteInvokeResponse;
    } catch (error) {
      throw toLambdaError(new Error(`Remote Lambda invoke returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`), "LAMBDA_PROVIDER_ERROR");
    }

    if (!payload.ok) {
      throw toLambdaError(payload.error, "LAMBDA_PROVIDER_ERROR");
    }

    return payload.response;
  }
}