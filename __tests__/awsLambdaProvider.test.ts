import { describe, expect, it, vi } from "vitest";

import { AwsLambdaProvider } from "../src/providers/AwsLambdaProvider.js";

describe("AwsLambdaProvider", () => {
  it("pins functionName and qualifier before invoking", async () => {
    const invoker = vi.fn(async (options) => ({
      result: { ok: true },
      statusCode: 200,
      functionError: null,
      executedVersion: options.qualifier ?? null,
      requestId: "req-1",
      logResult: null,
    }));

    const provider = new AwsLambdaProvider({
      invoker,
      policy: {
        pinnedFunctionName: "safe-function",
        pinnedQualifier: "live",
      },
    });

    const response = await provider.invoke({
      functionName: "user-supplied",
      qualifier: "dev",
      payload: { hello: "world" },
      mode: "buffered",
    });

    expect(invoker).toHaveBeenCalledTimes(1);
    expect(invoker).toHaveBeenCalledWith(expect.objectContaining({
      functionName: "safe-function",
      qualifier: "live",
    }));
    expect(response.statusCode).toBe(200);
  });

  it("rejects functionName outside the allowlist", async () => {
    const provider = new AwsLambdaProvider({
      invoker: vi.fn(),
      policy: {
        allowedFunctionNames: ["safe-function"],
      },
    });

    await expect(provider.invoke({
      functionName: "forbidden-function",
      payload: null,
      mode: "buffered",
    })).rejects.toMatchObject({
      code: "LAMBDA_POLICY_DENIED",
    });
  });

  it("allows functionName override only inside the allowlist", async () => {
    const invoker = vi.fn(async (options) => ({
      result: { ok: true },
      statusCode: 200,
      functionError: null,
      executedVersion: options.qualifier ?? null,
      requestId: "req-override",
      logResult: null,
    }));

    const provider = new AwsLambdaProvider({
      invoker,
      policy: {
        pinnedFunctionName: "default-function",
        allowFunctionNameOverride: true,
        allowedFunctionNames: ["default-function", "tenant-function"],
      },
    });

    await provider.invoke({
      functionName: "tenant-function",
      payload: null,
      mode: "buffered",
    });

    expect(invoker).toHaveBeenCalledWith(expect.objectContaining({
      functionName: "tenant-function",
    }));

    await expect(provider.invoke({
      functionName: "forbidden-function",
      payload: null,
      mode: "buffered",
    })).rejects.toMatchObject({
      code: "LAMBDA_POLICY_DENIED",
    });
  });

  it("applies qualifier pinning and allowlist rules", async () => {
    const pinnedInvoker = vi.fn(async (options) => ({
      result: { ok: true },
      statusCode: 200,
      functionError: null,
      executedVersion: options.qualifier ?? null,
      requestId: "req-pinned-qualifier",
      logResult: null,
    }));
    const pinnedProvider = new AwsLambdaProvider({
      invoker: pinnedInvoker,
      policy: {
        pinnedFunctionName: "safe-function",
        pinnedQualifier: "live",
      },
    });

    await pinnedProvider.invoke({
      functionName: "ignored",
      qualifier: "dev",
      payload: null,
      mode: "buffered",
    });

    expect(pinnedInvoker).toHaveBeenCalledWith(expect.objectContaining({
      qualifier: "live",
    }));

    const allowlistProvider = new AwsLambdaProvider({
      invoker: vi.fn(async (options) => ({
        result: { ok: true },
        statusCode: 200,
        functionError: null,
        executedVersion: options.qualifier ?? null,
        requestId: "req-allowed-qualifier",
        logResult: null,
      })),
      policy: {
        pinnedFunctionName: "safe-function",
        allowQualifierOverride: true,
        allowedQualifiers: ["live"],
      },
    });

    await expect(allowlistProvider.invoke({
      functionName: "ignored",
      qualifier: "dev",
      payload: null,
      mode: "buffered",
    })).rejects.toMatchObject({
      code: "LAMBDA_POLICY_DENIED",
    });
  });

  it("uses the injected streamInvoker for stream mode", async () => {
    const streamInvoker = vi.fn(async (_options, observer) => {
      observer.onChunk({ chunk: "Hel", textDelta: "Hel", firstByteLatency: 5 });
      observer.onChunk({ chunk: "lo", textDelta: "lo" });

      return {
        result: { ok: true },
        statusCode: 200,
        functionError: null,
        executedVersion: null,
        requestId: "req-stream",
        logResult: null,
        chunks: ["Hel", "lo"],
        text: "Hello",
        firstByteLatency: 5,
      };
    });

    const observer = { onChunk: vi.fn() };
    const provider = new AwsLambdaProvider({
      streamInvoker,
      policy: {
        pinnedFunctionName: "chat-stream",
      },
    });

    const response = await provider.invokeStream!({
      functionName: "ignored",
      payload: { prompt: "hi" },
      mode: "stream",
    }, observer);

    expect(streamInvoker).toHaveBeenCalledTimes(1);
    expect(observer.onChunk).toHaveBeenCalledTimes(2);
    expect(response.text).toBe("Hello");
  });

  it("uses AWS InvokeWithResponseStream when no streamInvoker is injected", async () => {
    const send = vi.fn(async () => ({
      StatusCode: 200,
      ExecutedVersion: "live",
      $metadata: { requestId: "req-sdk-stream" },
      EventStream: asyncIterable([
        { PayloadChunk: { Payload: new TextEncoder().encode('{"message":"') } },
        { PayloadChunk: { Payload: new TextEncoder().encode('hello"}') } },
        { InvokeComplete: { LogResult: btoa("tail log") } },
      ]),
    }));
    const observer = { onChunk: vi.fn() };
    const provider = new AwsLambdaProvider({
      sdkClient: { send },
      policy: {
        pinnedFunctionName: "chat-stream",
        pinnedQualifier: "live",
      },
    });

    const response = await provider.invokeStream!({
      functionName: "ignored",
      payload: { prompt: "hi" },
      mode: "stream",
    }, observer);

    expect(send).toHaveBeenCalledTimes(1);
    expect(observer.onChunk).toHaveBeenCalledTimes(2);
    expect(response).toMatchObject({
      result: { message: "hello" },
      statusCode: 200,
      functionError: null,
      executedVersion: "live",
      requestId: "req-sdk-stream",
      logResult: "tail log",
      chunks: ['{"message":"', 'hello"}'],
      text: '{"message":"hello"}',
    });
    expect(response.firstByteLatency).toEqual(expect.any(Number));
  });

  it("maps AWS response stream completion errors to functionError metadata", async () => {
    const send = vi.fn(async () => ({
      StatusCode: 200,
      ExecutedVersion: "live",
      $metadata: { requestId: "req-sdk-stream-error" },
      EventStream: asyncIterable([
        { InvokeComplete: { ErrorCode: "Unhandled", ErrorDetails: "stream failed" } },
      ]),
    }));
    const provider = new AwsLambdaProvider({
      sdkClient: { send },
      policy: {
        pinnedFunctionName: "chat-stream",
      },
    });

    const response = await provider.invokeStream!({
      functionName: "ignored",
      payload: null,
      mode: "stream",
    }, { onChunk: vi.fn() });

    expect(response).toMatchObject({
      result: "stream failed",
      functionError: "Unhandled",
      requestId: "req-sdk-stream-error",
      text: "stream failed",
      chunks: [],
    });
  });
});

async function* asyncIterable<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}