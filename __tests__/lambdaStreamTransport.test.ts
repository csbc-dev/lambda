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
