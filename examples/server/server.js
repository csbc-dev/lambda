import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createLambdaRemoteHandler, LambdaCore } from "@csbc-dev/lambda/server";

const port = Number(process.env.PORT ?? 3000);
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean));
const rootDir = fileURLToPath(new URL("..", import.meta.url));
const staticRoots = new Map([
  ["/dist/", join(rootDir, "..", "dist")],
  // The wcstack-state page loads @csbc-dev/lambda/auto from source pre-publish
  // (../../src/auto/auto.js, which itself imports ../../dist). Expose it so the
  // page can self-register the custom elements via <script src> like the CDN
  // (@csbc-dev/lambda/auto) would after publish.
  ["/src/auto/", join(rootDir, "..", "src", "auto")],
  ["/wcstack-state/", join(rootDir, "wcstack-state")],
  ["/shared/", join(rootDir, "shared")],
]);

const handler = createLambdaRemoteHandler(() => {
  const core = new LambdaCore();
  core.setProvider(createMockProvider());
  return core;
});

createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  if (url.pathname === "/api/lambda") {
    await sendFetchResponse(response, await handler(toFetchRequest(request, url)));
    return;
  }

  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (await tryServeStatic(url.pathname, response)) {
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
}).listen(port, () => {
  console.log(`Lambda example server listening on http://localhost:${port}`);
});

function toFetchRequest(request, url) {
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request,
    duplex: "half",
  });
}

async function sendFetchResponse(response, fetchResponse) {
  response.writeHead(fetchResponse.status, Object.fromEntries(fetchResponse.headers));
  if (!fetchResponse.body) {
    response.end();
    return;
  }

  const reader = fetchResponse.body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    response.write(value);
  }
  response.end();
}

async function tryServeStatic(pathname, response) {
  for (const [prefix, root] of staticRoots) {
    if (!pathname.startsWith(prefix)) continue;

    const relative = pathname.slice(prefix.length) || "index.html";
    const normalized = normalize(relative);
    if (normalized.startsWith("..")) {
      response.writeHead(403);
      response.end();
      return true;
    }

    const filePath = join(root, normalized.endsWith("/") ? `${normalized}index.html` : normalized);
    try {
      const file = await stat(filePath);
      if (!file.isFile()) return false;
      response.writeHead(200, { "content-type": contentType(filePath) });
      createReadStream(filePath).pipe(response);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".css": return "text/css; charset=utf-8";
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    default: return "text/plain; charset=utf-8";
  }
}

function createMockProvider() {
  return {
    async invoke(options) {
      await wait(260, options.signal);
      return {
        result: {
          ok: true,
          mode: "remote-buffered",
          functionName: options.functionName,
          qualifier: options.qualifier,
          received: options.payload,
          message: `Remote mock handled ${summarizePayload(options.payload)}`,
        },
        statusCode: 200,
        functionError: null,
        executedVersion: options.qualifier ?? "$LATEST",
        requestId: `remote-${crypto.randomUUID()}`,
        logResult: "remote mock log line 1\nremote mock log line 2",
      };
    },

    // Stream mode. Each chunk emitted through the observer is forwarded by the
    // Core to the remote handler, which writes it to the browser as an NDJSON
    // stream event in real time (the browser's LambdaRemoteProvider projects
    // them as they arrive). The returned chunks/text keep the terminal result
    // self-consistent with what was streamed.
    async invokeStream(options, observer) {
      const words = ["Remote", " stream", " response", " for ", summarizePayload(options.payload)];
      const chunks = [];
      let text = "";
      let firstByteLatency = null;
      const startedAt = performance.now();

      for (const chunk of words) {
        await wait(120, options.signal);
        chunks.push(chunk);
        text += chunk;
        firstByteLatency ??= performance.now() - startedAt;
        observer.onChunk({ chunk, textDelta: chunk, firstByteLatency });
      }

      return {
        result: { ok: true, mode: "remote-stream", text },
        statusCode: 200,
        functionError: null,
        executedVersion: options.qualifier ?? "$LATEST",
        requestId: `remote-stream-${crypto.randomUUID()}`,
        logResult: null,
        chunks,
        text,
        firstByteLatency,
      };
    },
  };
}

function wait(ms, signal) {
  if (signal?.aborted) {
    throw new DOMException("Invocation was aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DOMException("Invocation was aborted", "AbortError"));
    }, { once: true });
  });
}

function summarizePayload(payload) {
  if (payload === null || payload === undefined) return "empty payload";
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}
