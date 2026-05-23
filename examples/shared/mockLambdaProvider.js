function wait(ms, signal) {
  if (signal?.aborted) {
    throw new DOMException("Invocation was aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    let timeoutId;
    const abort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Invocation was aborted", "AbortError"));
    };

    timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function createRequestId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return `${prefix}-${uuid}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function summarizePayload(payload) {
  if (payload === null || payload === undefined) {
    return "empty payload";
  }

  if (typeof payload === "string") {
    return payload;
  }

  return JSON.stringify(payload);
}

export function parsePayloadText(value) {
  const text = value.trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function resolveRemoteEndpoint(value) {
  const text = value.trim();
  if (!text) {
    throw new Error("Remote endpoint is required when remote mode is enabled.");
  }

  const url = new URL(text, globalThis.location.href);
  if (url.origin !== globalThis.location.origin) {
    throw new Error("Remote endpoint must be same-origin in these browser examples.");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function formatExampleError(error) {
  if (error?.code && error?.message) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function formatValue(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

export function createMockLambdaProvider(options = {}) {
  const delay = options.delay ?? 420;

  return {
    async invoke(invokeOptions) {
      await wait(delay, invokeOptions.signal);

      return {
        result: {
          ok: true,
          mode: "buffered",
          functionName: invokeOptions.functionName,
          qualifier: invokeOptions.qualifier,
          received: invokeOptions.payload,
          message: `Mock Lambda handled ${summarizePayload(invokeOptions.payload)}`,
        },
        statusCode: 200,
        functionError: null,
        executedVersion: invokeOptions.qualifier ?? "$LATEST",
        requestId: createRequestId("mock"),
        logResult: "mock log line 1\nmock log line 2",
      };
    },

    async invokeStream(invokeOptions, observer) {
      const words = ["Mock", " stream", " response", " for ", summarizePayload(invokeOptions.payload)];
      const chunks = [];
      let text = "";
      let firstByteLatency = null;
      const startedAt = performance.now();

      for (const chunk of words) {
        await wait(150, invokeOptions.signal);
        chunks.push(chunk);
        text += chunk;
        firstByteLatency ??= performance.now() - startedAt;
        observer.onChunk({ chunk, textDelta: chunk, firstByteLatency });
      }

      return {
        result: { ok: true, mode: "stream", text },
        statusCode: 200,
        functionError: null,
        executedVersion: invokeOptions.qualifier ?? "$LATEST",
        requestId: createRequestId("mock-stream"),
        logResult: null,
        chunks,
        text,
        firstByteLatency,
      };
    },
  };
}