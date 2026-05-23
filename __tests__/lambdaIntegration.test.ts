import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootstrapLambda } from "../src/bootstrapLambda.js";
import { resetConfig, setConfig } from "../src/config.js";
import { bootstrapLambdaServer } from "../src/server/bootstrapLambdaServer.js";
import { createLambdaRemoteHandler } from "../src/server/createLambdaRemoteHandler.js";
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

  it("invokes a server-owned Core through lambda-invoke remote attachment", async () => {
    const invoker = vi.fn(async (options) => ({
      result: { echoed: options.payload, functionName: options.functionName },
      statusCode: 200,
      functionError: null,
      executedVersion: options.qualifier ?? null,
      requestId: "req-remote",
      logResult: null,
    }));
    const serverCore = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: {
        pinnedFunctionName: "server-owned-function",
        pinnedQualifier: "live",
      },
    });
    const handler = createLambdaRemoteHandler(serverCore);
    const remoteFetch = vi.fn(async (_input, init) => handler(new Request("https://example.test/lambda", {
      method: init?.method,
      headers: init?.headers,
      body: init?.body as BodyInit,
    }))) as unknown as typeof fetch;
    const invoke = document.createElement(integrationTagNames.lambdaInvoke) as LambdaInvoke;

    vi.stubGlobal("fetch", remoteFetch);

    try {
      invoke.setAttribute("function-name", "browser-choice");
      invoke.setAttribute("qualifier", "dev");
      invoke.payload = { prompt: "remote" };
      invoke.attachRemote("https://example.test/lambda");

      const response = await invoke.invoke();

      expect(remoteFetch).toHaveBeenCalledTimes(1);
      expect(invoker).toHaveBeenCalledWith(expect.objectContaining({
        functionName: "server-owned-function",
        qualifier: "live",
        payload: { prompt: "remote" },
      }));
      expect(response).toMatchObject({
        statusCode: 200,
        requestId: "req-remote",
      });
      expect(invoke.result).toEqual({
        echoed: { prompt: "remote" },
        functionName: "server-owned-function",
      });
      expect(invoke.error).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("attaches a remote provider declaratively through the remote-url attribute", async () => {
    const invoker = vi.fn(async (options) => ({
      result: { echoed: options.payload, functionName: options.functionName },
      statusCode: 200,
      functionError: null,
      executedVersion: options.qualifier ?? null,
      requestId: "req-remote-attr",
      logResult: null,
    }));
    const serverCore = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: { pinnedFunctionName: "server-owned-function" },
    });
    const handler = createLambdaRemoteHandler(serverCore);
    const remoteFetch = vi.fn(async (_input, init) => handler(new Request("https://example.test/lambda", {
      method: init?.method,
      headers: init?.headers,
      body: init?.body as BodyInit,
    }))) as unknown as typeof fetch;
    const invoke = document.createElement(integrationTagNames.lambdaInvoke) as LambdaInvoke;

    vi.stubGlobal("fetch", remoteFetch);

    try {
      invoke.setAttribute("function-name", "browser-choice");
      invoke.payload = { prompt: "via-attribute" };
      // Setting the attribute is the whole wiring step — no attachRemote() call.
      invoke.setAttribute("remote-url", "https://example.test/lambda");
      expect(invoke.remoteUrl).toBe("https://example.test/lambda");

      const response = await invoke.invoke();

      expect(remoteFetch).toHaveBeenCalledTimes(1);
      expect(response).toMatchObject({ statusCode: 200, requestId: "req-remote-attr" });
      expect(invoke.result).toMatchObject({ functionName: "server-owned-function" });
      expect(invoke.error).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("detaches the remote provider when remote-url is cleared", async () => {
    const invoke = document.createElement(integrationTagNames.lambdaInvoke) as LambdaInvoke;
    invoke.setAttribute("function-name", "demo-function");
    invoke.setAttribute("remote-url", "https://example.test/lambda");
    invoke.removeAttribute("remote-url");

    expect(invoke.remoteUrl).toBe("");

    const response = await invoke.invoke();

    expect(response).toBeUndefined();
    expect(invoke.error).toMatchObject({ code: "LAMBDA_CONFIG_ERROR" });
  });

  it("auto-attaches a remote provider from env config on connect (remoteEnv)", async () => {
    const invoker = vi.fn(async (options) => ({
      result: { echoed: options.payload, functionName: options.functionName },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-env",
      logResult: null,
    }));
    const serverCore = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: { pinnedFunctionName: "env-function" },
    });
    const handler = createLambdaRemoteHandler(serverCore);
    const remoteFetch = vi.fn(async (input, init) => handler(new Request(String(input), {
      method: init?.method,
      headers: init?.headers,
      body: init?.body as BodyInit,
    }))) as unknown as typeof fetch;
    const invoke = document.createElement(integrationTagNames.lambdaInvoke) as LambdaInvoke;

    vi.stubGlobal("fetch", remoteFetch);
    Reflect.set(globalThis, "LAMBDA_REMOTE_CORE_URL", "https://env.test/lambda");
    setConfig({ remote: { enableRemote: true, remoteSettingType: "env" } });

    try {
      invoke.setAttribute("function-name", "browser-choice");
      invoke.payload = { prompt: "env" };
      // No remote-url attribute and no setProvider — connecting must attach
      // the env-resolved provider on its own.
      document.body.appendChild(invoke);

      const response = await invoke.invoke();

      expect(remoteFetch).toHaveBeenCalledTimes(1);
      expect(remoteFetch.mock.calls[0][0]).toBe("https://env.test/lambda");
      expect(response).toMatchObject({ requestId: "req-env" });
      expect(invoke.result).toMatchObject({ functionName: "env-function" });
      expect(invoke.error).toBeNull();
    } finally {
      invoke.remove();
      setConfig({ remote: { enableRemote: false, remoteSettingType: "config", remoteCoreUrl: "" } });
      Reflect.deleteProperty(globalThis, "LAMBDA_REMOTE_CORE_URL");
      vi.unstubAllGlobals();
    }
  });

  it("prefers an explicit remote-url attribute over env auto-attach", async () => {
    const invoker = vi.fn(async (options) => ({
      result: { echoed: options.payload },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-attr-wins",
      logResult: null,
    }));
    const serverCore = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: { pinnedFunctionName: "attr-function" },
    });
    const handler = createLambdaRemoteHandler(serverCore);
    const remoteFetch = vi.fn(async (input, init) => handler(new Request(String(input), {
      method: init?.method,
      headers: init?.headers,
      body: init?.body as BodyInit,
    }))) as unknown as typeof fetch;
    const invoke = document.createElement(integrationTagNames.lambdaInvoke) as LambdaInvoke;

    vi.stubGlobal("fetch", remoteFetch);
    Reflect.set(globalThis, "LAMBDA_REMOTE_CORE_URL", "https://env.test/lambda");
    setConfig({ remote: { enableRemote: true, remoteSettingType: "env" } });

    try {
      invoke.setAttribute("function-name", "browser-choice");
      invoke.setAttribute("remote-url", "https://attr.test/lambda");
      invoke.payload = { prompt: "attr" };
      document.body.appendChild(invoke);

      await invoke.invoke();

      expect(remoteFetch).toHaveBeenCalledTimes(1);
      expect(remoteFetch.mock.calls[0][0]).toBe("https://attr.test/lambda");
    } finally {
      invoke.remove();
      setConfig({ remote: { enableRemote: false, remoteSettingType: "config", remoteCoreUrl: "" } });
      Reflect.deleteProperty(globalThis, "LAMBDA_REMOTE_CORE_URL");
      vi.unstubAllGlobals();
    }
  });

  it("rejects unauthenticated remote requests before invoking", async () => {
    const invoker = vi.fn(async () => ({
      result: { ok: true },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-unauthorized",
      logResult: null,
    }));
    const serverCore = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: { pinnedFunctionName: "server-owned-function" },
    });
    const handler = createLambdaRemoteHandler(serverCore, {
      authenticate: (request) => request.headers.get("authorization") === "Bearer valid",
    });

    const response = await handler(new Request("https://example.test/lambda", {
      method: "POST",
      body: JSON.stringify({
        command: "invoke",
        options: {
          functionName: "server-owned-function",
          payload: null,
          mode: "buffered",
        },
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "LAMBDA_AUTH_ERROR" },
    });
    expect(invoker).not.toHaveBeenCalled();
  });

  it("rejects malformed remote invocation options before invoking", async () => {
    const invoker = vi.fn(async () => ({
      result: { ok: true },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-malformed",
      logResult: null,
    }));
    const serverCore = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: { pinnedFunctionName: "server-owned-function" },
    });
    const handler = createLambdaRemoteHandler(serverCore);

    const response = await handler(new Request("https://example.test/lambda", {
      method: "POST",
      body: JSON.stringify({
        command: "invoke",
        options: {
          functionName: 123,
          mode: "buffered",
        },
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "LAMBDA_INPUT_ERROR" },
    });
    expect(invoker).not.toHaveBeenCalled();
  });

  it("returns normalized JSON when remote core factory fails", async () => {
    const handler = createLambdaRemoteHandler(() => {
      throw new Error("tenant config unavailable");
    });

    const response = await handler(new Request("https://example.test/lambda", {
      method: "POST",
      body: JSON.stringify({
        command: "invoke",
        options: {
          functionName: "server-owned-function",
          payload: null,
          mode: "buffered",
        },
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "LAMBDA_CONFIG_ERROR",
        message: "tenant config unavailable",
      },
    });
  });

  it("rejects concurrent requests when a shared remote Core is still active", async () => {
    let resolveInvoke: (value: {
      result: unknown;
      statusCode: number;
      functionError: null;
      executedVersion: null;
      requestId: string;
      logResult: null;
    }) => void = () => {};
    const invoker = vi.fn(async () => new Promise<{
      result: unknown;
      statusCode: number;
      functionError: null;
      executedVersion: null;
      requestId: string;
      logResult: null;
    }>((resolve) => {
      resolveInvoke = resolve;
    }));
    const serverCore = bootstrapLambdaServer({
      providerOptions: { invoker },
      pinPolicy: { pinnedFunctionName: "server-owned-function" },
    });
    const handler = createLambdaRemoteHandler(serverCore);
    const makeRequest = () => new Request("https://example.test/lambda", {
      method: "POST",
      body: JSON.stringify({
        command: "invoke",
        options: {
          functionName: "server-owned-function",
          payload: null,
          mode: "buffered",
        },
      }),
    });

    const first = handler(makeRequest());
    const second = await handler(makeRequest());
    const secondBody = await second.json();

    expect(second.status).toBe(409);
    expect(secondBody).toMatchObject({
      ok: false,
      error: { code: "LAMBDA_CONFIG_ERROR" },
    });

    resolveInvoke({
      result: { ok: true },
      statusCode: 200,
      functionError: null,
      executedVersion: null,
      requestId: "req-shared-core",
      logResult: null,
    });

    expect((await first).status).toBe(200);
  });

  it("times out and releases a stuck shared remote Core", async () => {
    vi.useFakeTimers();

    try {
      const invoker = vi.fn(async () => new Promise<never>(() => {}));
      const serverCore = bootstrapLambdaServer({
        providerOptions: { invoker },
        pinPolicy: { pinnedFunctionName: "server-owned-function" },
      });
      const handler = createLambdaRemoteHandler(serverCore, { sharedCoreTimeoutMs: 10 });
      const makeRequest = () => new Request("https://example.test/lambda", {
        method: "POST",
        body: JSON.stringify({
          command: "invoke",
          options: {
            functionName: "server-owned-function",
            payload: null,
            mode: "buffered",
          },
        }),
      });

      const first = handler(makeRequest());
      await vi.advanceTimersByTimeAsync(10);
      const firstResponse = await first;
      const firstBody = await firstResponse.json();

      expect(firstResponse.status).toBe(504);
      expect(firstBody).toMatchObject({
        ok: false,
        error: { code: "LAMBDA_INVOKE_FAILED" },
      });

      const second = handler(makeRequest());
      const overlapping = await handler(makeRequest());
      expect(overlapping.status).toBe(409);
      await vi.advanceTimersByTimeAsync(10);
      await second;
    } finally {
      vi.useRealTimers();
    }
  });

  it("surfaces policy-denied attribute updates without throwing", () => {
    const invoke = document.createElement(integrationTagNames.lambdaInvoke) as LambdaInvoke;
    invoke.setPinPolicy({ allowedFunctionNames: ["safe-function"] });

    expect(() => invoke.setAttribute("function-name", "forbidden-function")).not.toThrow();
    expect(invoke.functionName).toBe("");
    expect(invoke.error).toMatchObject({
      code: "LAMBDA_POLICY_DENIED",
    });
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

    let parentTextEvents = 0;
    let childTextEvents = 0;
    invoke.addEventListener("lambda-invoke:text-changed", () => parentTextEvents++);
    stream.addEventListener("lambda-stream:text-changed", () => childTextEvents++);

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
    expect(parentTextEvents).toBeGreaterThan(childTextEvents);
    expect(childTextEvents).toBe(1);

    invoke.remove();
  });

  it("surfaces a child-local error when lambda-stream has no parent", () => {
    const stream = document.createElement(integrationTagNames.lambdaStream) as LambdaStream;

    document.body.appendChild(stream);

    expect(stream.streamError).toMatchObject({
      code: "LAMBDA_PARENT_REQUIRED",
    });

    stream.remove();
  });

  it("stops projecting parent stream updates after lambda-stream detaches", async () => {
    const streamInvoker = vi.fn(async (_options, observer) => {
      const text = streamInvoker.mock.calls.length === 1 ? "Hello" : "Bye";
      observer.onChunk({ chunk: text, textDelta: text, firstByteLatency: 1 });

      return {
        result: { ok: true },
        statusCode: 200,
        functionError: null,
        executedVersion: null,
        requestId: `req-${text}`,
        logResult: null,
        chunks: [text],
        text,
        firstByteLatency: 1,
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

    await invoke.invoke();
    expect(stream.text).toBe("Hello");

    stream.remove();
    await invoke.invoke();

    expect(invoke.text).toBe("Bye");
    expect(stream.text).toBe("Hello");

    invoke.remove();
  });
});