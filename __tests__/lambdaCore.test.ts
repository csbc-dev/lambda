import { describe, expect, it, vi } from "vitest";

import { LambdaCore } from "../src/core/LambdaCore.js";
import type { ILambdaProvider } from "../src/types.js";

describe("LambdaCore", () => {
  it("applies stream chunks to the parent-owned state", async () => {
    const provider: ILambdaProvider = {
      invoke: vi.fn(async () => ({
        result: null,
        statusCode: 200,
        functionError: null,
        executedVersion: null,
        requestId: "req-buffered-fallback",
        logResult: null,
      })),
      invokeStream: vi.fn(async (_options, observer) => {
        observer.onChunk({ chunk: "Hel", textDelta: "Hel", firstByteLatency: 7 });
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
          firstByteLatency: 7,
        };
      }),
    };

    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "chat-stream" });

    await core.invoke({
      payload: { prompt: "hello" },
      mode: "stream",
    });

    expect(provider.invokeStream).toHaveBeenCalledTimes(1);
    expect(core.streaming).toBe(false);
    expect(core.done).toBe(true);
    expect(core.chunks).toEqual(["Hel", "lo"]);
    expect(core.text).toBe("Hello");
    expect(core.firstByteLatency).toBe(7);
    expect(core.requestId).toBe("req-stream");
  });

  it("surfaces configuration errors when no provider is attached", async () => {
    const core = new LambdaCore();
    core.setPinPolicy({ pinnedFunctionName: "safe-function" });

    const response = await core.invoke({ payload: { ok: true } });

    expect(response).toBeUndefined();
    expect(core.error).toMatchObject({
      code: "LAMBDA_CONFIG_ERROR",
    });
    expect(core.invoking).toBe(false);
  });
});