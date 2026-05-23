import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootstrapLambda } from "../src/bootstrapLambda.js";
import { resetConfig } from "../src/config.js";
import { bootstrapLambdaServer } from "../src/server/bootstrapLambdaServer.js";
import type { LambdaInvoke } from "../src/components/LambdaInvoke.js";
import type { LambdaStream } from "../src/components/LambdaStream.js";

const integrationTagNames = {
  lambdaInvoke: "lambda-invoke-integration",
  lambdaStream: "lambda-stream-integration",
} as const;

describe("lambda integration", () => {
  beforeAll(() => {
    bootstrapLambda({ tagNames: integrationTagNames });
  });

  afterAll(() => {
    resetConfig();
  });

  it("wires bootstrapLambdaServer through AwsLambdaProvider into LambdaCore state", async () => {
    const invoker = vi.fn(async (options) => ({
      result: { echoed: options.payload },
      statusCode: 202,
      functionError: null,
      executedVersion: options.qualifier ?? null,
      requestId: "req-server-bootstrap",
      logResult: "tail-log",
    }));

    const core = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: {
        pinnedFunctionName: "safe-function",
        pinnedQualifier: "live",
      },
    });

    const response = await core.invoke({
      functionName: "ignored-by-policy",
      qualifier: "dev",
      payload: { prompt: "hello" },
    });

    expect(invoker).toHaveBeenCalledTimes(1);
    expect(invoker).toHaveBeenCalledWith(expect.objectContaining({
      functionName: "safe-function",
      qualifier: "live",
      payload: { prompt: "hello" },
    }));
    expect(response).toMatchObject({
      statusCode: 202,
      requestId: "req-server-bootstrap",
    });
    expect(core.result).toEqual({ echoed: { prompt: "hello" } });
    expect(core.statusCode).toBe(202);
    expect(core.requestId).toBe("req-server-bootstrap");
    expect(core.executedVersion).toBe("live");
    expect(core.logResult).toBe("tail-log");
    expect(core.error).toBeNull();
    expect(core.invoking).toBe(false);
  });

  it("projects streaming state from lambda-invoke to lambda-stream after bootstrap", async () => {
    const streamInvoker = vi.fn(async (_options, observer) => {
      observer.onChunk({ chunk: "Hel", textDelta: "Hel", firstByteLatency: 4 });
      observer.onChunk({ chunk: "lo", textDelta: "lo" });

      return {
        result: { ok: true },
        statusCode: 200,
        functionError: null,
        executedVersion: null,
        requestId: "req-dom-stream",
        logResult: null,
        chunks: ["Hel", "lo"],
        text: "Hello",
        firstByteLatency: 4,
      };
    });

    const invoke = document.createElement(integrationTagNames.lambdaInvoke) as LambdaInvoke;
    const stream = document.createElement(integrationTagNames.lambdaStream) as LambdaStream;
    invoke.setAttribute("function-name", "chat-stream");
    invoke.setAttribute("mode", "stream");
    invoke.setProvider({
      invoke: vi.fn(),
      invokeStream: streamInvoker,
    });

    invoke.appendChild(stream);
    document.body.appendChild(invoke);

    const response = await invoke.invoke();

    expect(streamInvoker).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({
      requestId: "req-dom-stream",
      text: "Hello",
    });
    expect(invoke.streaming).toBe(false);
    expect(invoke.chunks).toEqual(["Hel", "lo"]);
    expect(invoke.text).toBe("Hello");
    expect(invoke.done).toBe(true);
    expect(invoke.firstByteLatency).toBe(4);
    expect(stream.streaming).toBe(false);
    expect(stream.chunks).toEqual(["Hel", "lo"]);
    expect(stream.text).toBe("Hello");
    expect(stream.done).toBe(true);
    expect(stream.firstByteLatency).toBe(4);
    expect(stream.streamError).toBeNull();

    invoke.remove();
  });
});