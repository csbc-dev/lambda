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

  it("pins logType so the browser cannot request tail logs", async () => {
    const invoke = vi.fn(async () => ({
      result: null,
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-log-pinned",
      logResult: null,
    }));
    const provider: ILambdaProvider = { invoke };

    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "safe-function", pinnedLogType: "None" });

    // A client request to set Tail is ignored while the policy pins None.
    core.logType = "Tail";
    expect(core.logType).toBe("None");

    await core.invoke({ payload: null, logType: "Tail" });

    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ logType: "None" }));
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
    expect(core.error).toMatchObject({
      code: "LAMBDA_ABORTED",
    });
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

  it("aborts stale work before rejecting invalid invocation options", async () => {
    let firstSignal: AbortSignal | undefined;
    let resolveFirst: (response: LambdaInvokeResponse) => void = () => {};
    const provider: ILambdaProvider = {
      invoke: vi.fn((options) => {
        firstSignal = options.signal;
        return new Promise<LambdaInvokeResponse>((resolve) => {
          resolveFirst = resolve;
        });
      }),
    };

    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ allowedFunctionNames: ["safe-function"] });

    const first = core.invoke({ functionName: "safe-function", payload: "first" });
    const second = await core.invoke({ functionName: "forbidden-function", payload: "second" });

    expect(second).toBeUndefined();
    expect(firstSignal?.aborted).toBe(true);
    expect(provider.invoke).toHaveBeenCalledTimes(1);
    expect(core.error).toMatchObject({
      code: "LAMBDA_POLICY_DENIED",
    });
    expect(core.invoking).toBe(false);

    resolveFirst({
      result: { stale: true },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-stale",
      logResult: null,
    });

    await first;

    expect(core.result).toBeNull();
    expect(core.requestId).toBeNull();
  });

  it("clears streaming state when stream invocation fails", async () => {
    const provider: ILambdaProvider = {
      invoke: vi.fn(),
      invokeStream: vi.fn(async () => {
        throw new Error("stream failed");
      }),
    };
    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "chat-stream" });

    const response = await core.invoke({ payload: null, mode: "stream" });

    expect(response).toBeUndefined();
    expect(core.streaming).toBe(false);
    expect(core.streamError).toMatchObject({
      code: "LAMBDA_INVOKE_FAILED",
    });
  });

  it("surfaces Lambda function errors on streamError in stream mode", async () => {
    const provider: ILambdaProvider = {
      invoke: vi.fn(),
      invokeStream: vi.fn(async () => ({
        result: { errorMessage: "boom" },
        statusCode: 200,
        functionError: "Unhandled",
        executedVersion: null,
        requestId: "req-stream-function-error",
        logResult: null,
        chunks: [],
        text: "",
        firstByteLatency: null,
      })),
    };
    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "chat-stream" });

    await core.invoke({ payload: null, mode: "stream" });

    expect(core.error).toMatchObject({
      code: "LAMBDA_FUNCTION_ERROR",
    });
    expect(core.streamError).toMatchObject({
      code: "LAMBDA_FUNCTION_ERROR",
    });
  });

  it("does not mark an aborted stream invocation as done", async () => {
    let resolveStream: (response: LambdaInvokeResponse) => void = () => {};
    const provider: ILambdaProvider = {
      invoke: vi.fn(),
      invokeStream: vi.fn((_options, observer) => {
        observer.onChunk({ chunk: "partial", textDelta: "partial", firstByteLatency: 1 });
        return new Promise<LambdaInvokeResponse>((resolve) => {
          resolveStream = resolve;
        });
      }),
    };
    const core = new LambdaCore(undefined, provider);
    core.setPinPolicy({ pinnedFunctionName: "chat-stream" });

    const invokePromise = core.invoke({ payload: null, mode: "stream" });

    core.abort();
    resolveStream({
      result: "partial",
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-aborted-stream",
      logResult: null,
      chunks: ["partial"],
      text: "partial",
      firstByteLatency: 1,
    });

    await invokePromise;

    expect(core.streaming).toBe(false);
    expect(core.done).toBe(false);
    expect(core.streamError).toMatchObject({
      code: "LAMBDA_ABORTED",
    });
  });

  it("reset aborts active work and suppresses late results", async () => {
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

    core.reset();
    resolveInvoke({
      result: { stale: true },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-reset-stale",
      logResult: null,
    });

    await invokePromise;

    expect(signal?.aborted).toBe(true);
    expect(core.invoking).toBe(false);
    expect(core.result).toBeNull();
    expect(core.requestId).toBeNull();
    expect(core.error).toBeNull();
  });
});