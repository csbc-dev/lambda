import { toLambdaError } from "../raiseError.js";
import type {
  ILambdaProvider,
  LambdaError,
  LambdaInvokeOptions,
  LambdaInvokeResponse,
  LambdaRemoteInvokeRequest,
  LambdaRemoteInvokeResponse,
  LambdaRemoteProviderOptions,
  LambdaRemoteStreamEvent,
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
    this.#fetch = options.fetch ?? globalThis.fetch?.bind(globalThis);
    this.#headers = options.headers ?? {};

    if (!this.#fetch) {
      throw toLambdaError(new Error("fetch is not available for LambdaRemoteProvider"), "LAMBDA_CONFIG_ERROR");
    }
  }

  async invoke(options: LambdaInvokeOptions): Promise<LambdaInvokeResponse> {
    const response = await this.#post(options);
    return this.#parseJsonResponse(response);
  }

  async invokeStream(options: LambdaInvokeOptions, observer: LambdaStreamObserver): Promise<LambdaInvokeResponse> {
    const response = await this.#post({ ...options, mode: "stream" });
    const contentType = response.headers.get("content-type") ?? "";

    if (response.body && isNdjson(contentType)) {
      return this.#readStreamResponse(response.body, observer, options.signal);
    }

    // Backward-compatible fallback: a server that returns one buffered JSON
    // response rather than the NDJSON stream. Replay the returned chunks after
    // completion so the observer still sees them. `firstByteLatency` here is the
    // server-measured value, not browser-perceived.
    const buffered = await this.#parseJsonResponse(response);
    replayBufferedChunks(buffered, observer);
    return buffered;
  }

  async #post(options: LambdaInvokeOptions): Promise<Response> {
    const { signal, ...serializableOptions } = options;
    const body = {
      command: "invoke",
      options: serializableOptions,
    } satisfies LambdaRemoteInvokeRequest;

    // Normalize user headers through `Headers` so all three HeadersInit forms
    // (plain object, [k,v][] array, Headers instance) merge correctly — object
    // spread would silently drop the array/Headers forms, losing Authorization
    // etc. The request body is always JSON (and the response is JSON/NDJSON by
    // contract), so we pin content-type AFTER merging user headers: the fixed
    // value wins and a stray user content-type cannot break the wire format.
    const headers = new Headers(this.#headers);
    headers.set("content-type", "application/json");

    const response = await this.#fetch(this.#url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const statusText = response.statusText ? ` ${response.statusText}` : "";
      throw toLambdaError(new Error(`Remote Lambda invoke failed with HTTP ${response.status}${statusText}`), "LAMBDA_PROVIDER_ERROR");
    }

    return response;
  }

  async #parseJsonResponse(response: Response): Promise<LambdaInvokeResponse> {
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

  async #readStreamResponse(body: ReadableStream<Uint8Array>, observer: LambdaStreamObserver, signal?: AbortSignal): Promise<LambdaInvokeResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedChunk = false;
    let result: LambdaInvokeResponse | undefined;
    let failure: LambdaError | undefined;

    const handleLine = (line: string): void => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      let event: LambdaRemoteStreamEvent;
      try {
        event = JSON.parse(trimmed) as LambdaRemoteStreamEvent;
      } catch (error) {
        throw toLambdaError(new Error(`Remote Lambda stream returned invalid NDJSON: ${error instanceof Error ? error.message : String(error)}`), "LAMBDA_PROVIDER_ERROR");
      }

      if (event.type === "chunk") {
        receivedChunk = true;
        observer.onChunk({ chunk: event.chunk, textDelta: event.textDelta, firstByteLatency: event.firstByteLatency });
      } else if (event.type === "result") {
        result = event.response;
      } else if (event.type === "error") {
        failure = event.error;
      }
    };

    try {
      for (;;) {
        // Stop reading and projecting as soon as the invocation is aborted.
        // fetch's own abort also rejects reader.read(), but checking the signal
        // explicitly guarantees we never emit a chunk after abort and frees the
        // reader promptly — symmetric with the AWS SDK stream path, which checks
        // `options.signal?.aborted` per event. The Core's #isCurrentInvocation
        // guard is a second line of defense, not the only one.
        if (signal?.aborted) {
          await reader.cancel().catch(() => {});
          throw toLambdaError(new Error("Remote Lambda stream aborted"), "LAMBDA_ABORTED");
        }

        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          if (signal?.aborted) {
            await reader.cancel().catch(() => {});
            throw toLambdaError(new Error("Remote Lambda stream aborted"), "LAMBDA_ABORTED");
          }
          handleLine(buffer.slice(0, newlineIndex));
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");
        }
      }

      buffer += decoder.decode();
      handleLine(buffer);
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    }

    if (failure) {
      throw toLambdaError(failure, "LAMBDA_PROVIDER_ERROR");
    }

    if (!result) {
      throw toLambdaError(new Error("Remote Lambda stream ended without a result"), "LAMBDA_PROVIDER_ERROR");
    }

    // A server that streamed NDJSON but delivered chunks only in the terminal
    // result (for example, a non-streaming provider behind the streaming
    // handler) still needs its chunks projected to the observer.
    if (!receivedChunk) {
      replayBufferedChunks(result, observer);
    }

    return result;
  }
}

function isNdjson(contentType: string): boolean {
  return contentType.includes("ndjson") || contentType.includes("jsonl");
}

function replayBufferedChunks(response: LambdaInvokeResponse, observer: LambdaStreamObserver): void {
  (response.chunks ?? []).forEach((chunk, index) => {
    observer.onChunk({
      chunk,
      textDelta: chunk,
      firstByteLatency: index === 0 ? response.firstByteLatency : undefined,
    });
  });
}
