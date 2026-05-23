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
});