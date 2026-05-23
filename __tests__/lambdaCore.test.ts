import { describe, expect, it, vi } from "vitest";

import { LambdaCore } from "../src/core/LambdaCore.js";
import type { ILambdaProvider, LambdaInvokeResponse } from "../src/types.js";

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

  it("distinguishes Lambda function errors from transport failures", async () => {
    const provider: ILambdaProvider = {
      invoke: vi.fn(async () => ({
        result: { errorMessage: "boom" },
        statusCode: 200,
        functionError: "Unhandled",
        executedVersion: "live",
        requestId: "req-function-error",
        logResult: null,
      })),
    };
    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "safe-function" });

    const response = await core.invoke({ payload: null });

    expect(response).toMatchObject({
      functionError: "Unhandled",
      requestId: "req-function-error",
    });
    expect(core.result).toEqual({ errorMessage: "boom" });
    expect(core.functionError).toBe("Unhandled");
    expect(core.error).toMatchObject({
      code: "LAMBDA_FUNCTION_ERROR",
      message: "Lambda function returned Unhandled",
    });
  });

  it("aborts the active provider signal and suppresses aborted results", async () => {
    let signal: AbortSignal | undefined;
    let resolveInvoke: (response: LambdaInvokeResponse) => void = () => {};

    const provider: ILambdaProvider = {
      invoke: vi.fn((options) => {
        signal = options.signal;
        return new Promise<LambdaInvokeResponse>((resolve) => {
          resolveInvoke = resolve;
        });
      }),
    };

    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "safe-function" });

    const invokePromise = core.invoke({ payload: { ok: true } });

    expect(signal?.aborted).toBe(false);

    core.abort();
    resolveInvoke({
      result: { stale: true },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-aborted",
      logResult: null,
    });

    await invokePromise;

    expect(signal?.aborted).toBe(true);
    expect(core.result).toBeNull();
    expect(core.requestId).toBeNull();
    expect(core.error).toBeNull();
    expect(core.invoking).toBe(false);
  });

  it("keeps newer invocation state when an older invocation resolves later", async () => {
    const pending: Array<(response: LambdaInvokeResponse) => void> = [];
    const provider: ILambdaProvider = {
      invoke: vi.fn(() => new Promise<LambdaInvokeResponse>((resolve) => {
        pending.push(resolve);
      })),
    };

    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "safe-function" });

    const first = core.invoke({ payload: "first" });
    const firstSignal = vi.mocked(provider.invoke).mock.calls[0]?.[0].signal;
    const second = core.invoke({ payload: "second" });

    expect(firstSignal?.aborted).toBe(true);

    pending[1]?.({
      result: { value: "second" },
      statusCode: 202,
      functionError: null,
      executedVersion: null,
      requestId: "req-second",
      logResult: null,
    });

    await second;

    expect(core.result).toEqual({ value: "second" });
    expect(core.requestId).toBe("req-second");
    expect(core.statusCode).toBe(202);

    pending[0]?.({
      result: { value: "first" },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-first",
      logResult: null,
    });

    await first;

    expect(core.result).toEqual({ value: "second" });
    expect(core.requestId).toBe("req-second");
    expect(core.statusCode).toBe(202);
  });
});