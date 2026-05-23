// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { LambdaCore } from "../src/core/LambdaCore.js";
import { createLambdaRemoteHandler, type LambdaRemoteHandler } from "../src/server/createLambdaRemoteHandler.js";
import { LambdaRemoteProvider } from "../src/remote/LambdaRemoteProvider.js";
import type { ILambdaProvider, LambdaStreamObserver } from "../src/types.js";

describe("remote streaming transport (NDJSON)", () => {
  it("emits per-chunk NDJSON events terminated by a single result event", async () => {
    const handler = createLambdaRemoteHandler(streamCore(["He", "llo"]));

    const response = await handler(streamRequest());

    expect(response.headers.get("content-type")).toContain("ndjson");

    const events = await readNdjson(response);
    expect(events.map((event) => event.type)).toEqual(["chunk", "chunk", "result"]);
    expect(events[0]).toMatchObject({ type: "chunk", chunk: "He", firstByteLatency: 3 });
    expect(events[1]).toMatchObject({ type: "chunk", chunk: "llo" });
    expect(events[2]).toMatchObject({
      type: "result",
      response: { text: "Hello", requestId: "req-stream-transport" },
    });
  });

  it("delivers chunks to the browser provider as events, not a post-completion replay", async () => {
    const handler = createLambdaRemoteHandler(streamCore(["foo", "bar", "baz"]));
    const provider = providerFor(handler);

    const received: string[] = [];
    const response = await provider.invokeStream(
      { functionName: "chat-stream", payload: { prompt: "hi" }, mode: "stream" },
      { onChunk: (chunk) => received.push(chunk.chunk) },
    );

    expect(received).toEqual(["foo", "bar", "baz"]);
    expect(response).toMatchObject({ text: "foobarbaz", requestId: "req-stream-transport" });
  });

  it("does not let a cancelled stream's late release steal a newer request's shared-core lock", async () => {
    // Reproduces the double-release hazard: a cancelled stream frees the shared
    // lock from cancel(), a newer request acquires it, then the cancelled
    // stream's start() finally runs a second release. A non-idempotent release
    // would free the *newer* request's lock and let a third request run
    // concurrently against the shared Core.
    let resolveStreamInvoke: () => void = () => {};
    const streamInvoker = vi.fn(() => new Promise<{
      result: unknown; statusCode: number; functionError: null; executedVersion: null; requestId: string; logResult: null;
    }>((resolve) => {
      resolveStreamInvoke = () => resolve({
        result: { ok: true }, statusCode: 200, functionError: null, executedVersion: null, requestId: "req-cancelled-stream", logResult: null,
      });
    }));
    const core = new LambdaCore(undefined, { invoke: vi.fn(), invokeStream: streamInvoker });
    core.setPinPolicy({ pinnedFunctionName: "chat-stream" });
    const handler = createLambdaRemoteHandler(core);

    // Request A: stream mode, acquires the shared lock; invoke stays pending.
    const aResponse = await handler(streamRequest());
    expect(aResponse.headers.get("content-type")).toContain("ndjson");

    // The consumer cancels A's body mid-stream → handler.cancel() releases the
    // lock (first release for A).
    await aResponse.body!.cancel();

    // Request B (buffered) now acquires the freed lock; invoke stays pending.
    let resolveB: () => void = () => {};
    const bInvoke = vi.fn();
    // Swap the invoker so B's buffered call is the one we control. Re-bind via a
    // fresh provider on the same shared core.
    core.setProvider({ invoke: bInvoke, invokeStream: streamInvoker });
    const bAcquired = new Promise<void>((resolve) => {
      bInvoke.mockImplementationOnce(() => new Promise((resolveInvoke) => {
        resolveB = () => resolveInvoke({
          result: { ok: true }, statusCode: 200, functionError: null, executedVersion: null, requestId: "req-b", logResult: null,
        });
        resolve(); // signal that B has acquired the lock and reached invoke()
      }));
    });
    const bPromise = handler(bufferedRequest());
    // Wait until B has actually acquired the lock and entered invoke().
    await bAcquired;

    // Now A's pending streamInvoke settles → A's start() finally runs its second
    // release. Idempotency must make it a no-op so B keeps the lock.
    resolveStreamInvoke();
    await Promise.resolve();
    await Promise.resolve();

    // Request C must still be rejected with 409 because B holds the lock.
    const cResponse = await handler(bufferedRequest());
    expect(cResponse.status).toBe(409);

    resolveB();
    expect((await bPromise).status).toBe(200);
  });

  it("surfaces a terminal error event as a rejected stream", async () => {
    const failing: ILambdaProvider = {
      invoke: vi.fn(),
      invokeStream: vi.fn(async () => {
        throw new Error("boom");
      }),
    };
    const core = new LambdaCore(undefined, failing);
    core.setPinPolicy({ pinnedFunctionName: "chat-stream" });
    const provider = providerFor(createLambdaRemoteHandler(core));

    await expect(provider.invokeStream(
      { functionName: "chat-stream", payload: null, mode: "stream" },
      { onChunk: vi.fn() },
    )).rejects.toMatchObject({ code: "LAMBDA_INVOKE_FAILED" });
  });

  it("falls back to replaying chunks when the server returns buffered JSON", async () => {
    const bufferedFetch = (async () => Response.json({
      ok: true,
      response: {
        result: { ok: true },
        statusCode: 200,
        functionError: null,
        executedVersion: null,
        requestId: "req-buffered",
        logResult: null,
        chunks: ["x", "y"],
        text: "xy",
        firstByteLatency: 9,
      },
    })) as unknown as typeof fetch;

    const provider = new LambdaRemoteProvider({ url: "https://example.test/lambda", fetch: bufferedFetch });
    const received: Array<{ chunk: string; firstByteLatency?: number | null }> = [];
    const response = await provider.invokeStream(
      { functionName: "chat-stream", payload: null, mode: "stream" },
      { onChunk: (chunk) => received.push({ chunk: chunk.chunk, firstByteLatency: chunk.firstByteLatency }) },
    );

    expect(received).toEqual([
      { chunk: "x", firstByteLatency: 9 },
      { chunk: "y", firstByteLatency: undefined },
    ]);
    expect(response).toMatchObject({ requestId: "req-buffered" });
  });

  it("throws when the NDJSON stream ends without a terminal result", async () => {
    const onlyChunks = (async () => ndjsonResponse([{ type: "chunk", chunk: "a" }])) as unknown as typeof fetch;
    const provider = new LambdaRemoteProvider({ url: "https://example.test/lambda", fetch: onlyChunks });

    await expect(provider.invokeStream(
      { functionName: "chat-stream", payload: null, mode: "stream" },
      { onChunk: vi.fn() },
    )).rejects.toMatchObject({
      code: "LAMBDA_PROVIDER_ERROR",
      message: "Remote Lambda stream ended without a result",
    });
  });

  it("preserves the terminal error event's code verbatim (does not collapse to LAMBDA_PROVIDER_ERROR)", async () => {
    // A server-side policy denial reaches the browser as a terminal NDJSON error
    // event. The provider must surface the original code (LAMBDA_POLICY_DENIED),
    // not reclassify it — error classification is mode-independent (SPEC 13.1).
    const deniedStream = (async () => ndjsonResponse([
      { type: "error", error: { code: "LAMBDA_POLICY_DENIED", message: "functionName is not allowed by policy" } },
    ])) as unknown as typeof fetch;
    const provider = new LambdaRemoteProvider({ url: "https://example.test/lambda", fetch: deniedStream });

    await expect(provider.invokeStream(
      { functionName: "chat-stream", payload: null, mode: "stream" },
      { onChunk: vi.fn() },
    )).rejects.toMatchObject({
      code: "LAMBDA_POLICY_DENIED",
      message: "functionName is not allowed by policy",
    });
  });

  it("stops reading the NDJSON stream once the signal is aborted", async () => {
    const controller = new AbortController();
    const projected: string[] = [];
    // The stream cancels its underlying reader when aborted; record that the
    // provider stopped pulling and never projected a chunk after abort.
    let cancelled = false;
    const aborted = (async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(streamController) {
          streamController.enqueue(encoder.encode(`${JSON.stringify({ type: "chunk", chunk: "a" })}\n`));
          streamController.enqueue(encoder.encode(`${JSON.stringify({ type: "chunk", chunk: "b" })}\n`));
          streamController.enqueue(encoder.encode(`${JSON.stringify({ type: "result", response: { result: null, statusCode: 200, functionError: null, executedVersion: null, requestId: "req-aborted", logResult: null, chunks: ["a", "b"], text: "ab", firstByteLatency: 1 } })}\n`));
          streamController.close();
        },
        cancel() {
          cancelled = true;
        },
      });
      return new Response(stream, { headers: { "content-type": "application/x-ndjson" } });
    }) as unknown as typeof fetch;

    const provider = new LambdaRemoteProvider({ url: "https://example.test/lambda", fetch: aborted });

    // Abort before invoking: the read loop must bail with LAMBDA_ABORTED before
    // projecting any chunk, and cancel the reader.
    controller.abort();

    await expect(provider.invokeStream(
      { functionName: "chat-stream", payload: null, mode: "stream", signal: controller.signal },
      { onChunk: (chunk) => projected.push(chunk.chunk) },
    )).rejects.toMatchObject({ code: "LAMBDA_ABORTED" });

    expect(projected).toEqual([]);
    expect(cancelled).toBe(true);
  });

  it("reassembles chunk events split across stream reads", async () => {
    const split = (async () => splitNdjsonResponse([
      { type: "chunk", chunk: "alpha" },
      { type: "chunk", chunk: "beta" },
      { type: "result", response: { result: null, statusCode: 200, functionError: null, executedVersion: null, requestId: "req-split", logResult: null, chunks: ["alpha", "beta"], text: "alphabeta", firstByteLatency: 1 } },
    ])) as unknown as typeof fetch;
    const provider = new LambdaRemoteProvider({ url: "https://example.test/lambda", fetch: split });

    const received: string[] = [];
    const response = await provider.invokeStream(
      { functionName: "chat-stream", payload: null, mode: "stream" },
      { onChunk: (chunk) => received.push(chunk.chunk) },
    );

    expect(received).toEqual(["alpha", "beta"]);
    expect(response).toMatchObject({ requestId: "req-split" });
  });
});

function streamCore(chunks: string[]): LambdaCore {
  const provider: ILambdaProvider = {
    invoke: vi.fn(),
    invokeStream: vi.fn(async (_options, observer: LambdaStreamObserver) => {
      let text = "";
      chunks.forEach((chunk, index) => {
        text += chunk;
        observer.onChunk({ chunk, textDelta: chunk, firstByteLatency: index === 0 ? 3 : undefined });
      });

      return {
        result: { ok: true, text },
        statusCode: 200,
        functionError: null,
        executedVersion: "live",
        requestId: "req-stream-transport",
        logResult: null,
        chunks,
        text,
        firstByteLatency: 3,
      };
    }),
  };

  const core = new LambdaCore(undefined, provider);
  core.setPinPolicy({ pinnedFunctionName: "chat-stream" });
  return core;
}

function streamRequest(): Request {
  return new Request("https://example.test/lambda", {
    method: "POST",
    body: JSON.stringify({
      command: "invoke",
      options: { functionName: "chat-stream", payload: { prompt: "hi" }, mode: "stream" },
    }),
  });
}

function bufferedRequest(): Request {
  return new Request("https://example.test/lambda", {
    method: "POST",
    body: JSON.stringify({
      command: "invoke",
      options: { functionName: "chat-stream", payload: null, mode: "buffered" },
    }),
  });
}

function providerFor(handler: LambdaRemoteHandler): LambdaRemoteProvider {
  return new LambdaRemoteProvider({
    url: "https://example.test/lambda",
    fetch: ((_url, init) => handler(new Request("https://example.test/lambda", {
      method: "POST",
      headers: init?.headers,
      body: init?.body as BodyInit,
    }))) as unknown as typeof fetch,
  });
}

function ndjsonResponse(events: object[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson" } });
}

// Emits the NDJSON payload in byte slices that deliberately cut across newline
// boundaries, exercising the provider's partial-line buffering.
function splitNdjsonResponse(events: object[]): Response {
  const encoder = new TextEncoder();
  const full = events.map((event) => `${JSON.stringify(event)}\n`).join("");
  const bytes = encoder.encode(full);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sliceSize = 7;
      for (let offset = 0; offset < bytes.length; offset += sliceSize) {
        controller.enqueue(bytes.slice(offset, offset + sliceSize));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson" } });
}

async function readNdjson(response: Response): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const text = await response.text();
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}
