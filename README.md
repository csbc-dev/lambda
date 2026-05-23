# @csbc-dev/lambda

Declarative AWS Lambda invocation components for Web Components, shaped by CSBC and `wc-bindable-protocol`.

## Current state

This repository is in alpha implementation.

- Parent authority tag: `<lambda-invoke>`
- Child stream projection tag: `<lambda-stream>`
- Buffered invoke: implemented through `AwsLambdaProvider`
- Stream invoke: implemented through AWS `InvokeWithResponseStream`; custom transports can still be injected through `streamInvoker`
- Remote invocation: implemented through a fetch-backed browser provider and server-owned Core handler
- Remote streaming: the remote handler streams chunks to the browser over NDJSON as they arrive (no buffering); a buffered-JSON server still works as a fallback

The design intent is documented in [CLAUDE.md](https://github.com/csbc-dev/lambda/blob/main/CLAUDE.md) and the package contract is fixed in [SPEC.md](SPEC.md).

## Examples

Runnable browser examples for Vanilla DOM, React, Vue, and `@wcstack/state` live in the [examples README](https://github.com/csbc-dev/lambda/blob/main/examples/README.md).

The Vite examples install the local package from the workspace, and the static `@wcstack/state` example loads it through `@csbc-dev/lambda/auto`. All examples are remote-first: they call a server-owned Core at `/api/lambda` (the example server holds the provider), so AWS credentials never reach the browser.

## Install

```bash
npm install @csbc-dev/lambda
```

## Browser-side shape

```html
<lambda-invoke id="chat" mode="stream">
	<lambda-stream></lambda-stream>
</lambda-invoke>
```

`<lambda-invoke>` owns inputs, commands, and common invocation state. `<lambda-stream>` is a projection shell that attaches to the nearest parent `<lambda-invoke>`.

## Server-side bootstrap

Use `bootstrapLambdaServer()` to create a `LambdaCore` with an `AwsLambdaProvider` attached.

```ts
import { bootstrapLambdaServer } from "@csbc-dev/lambda/server";

const core = bootstrapLambdaServer({
	pinPolicy: {
		pinnedFunctionName: "my-safe-function",
		pinnedQualifier: "live",
	},
});
```

If you need direct control, create the provider yourself and attach it to a `LambdaCore` or `<lambda-invoke>`.

```ts
import { AwsLambdaProvider, LambdaCore } from "@csbc-dev/lambda/server";

const provider = new AwsLambdaProvider({
	policy: {
		pinnedFunctionName: "my-safe-function",
		pinnedQualifier: "live",
	},
});

const core = new LambdaCore(undefined, provider);
```

## Remote invocation

Browser components can attach to a server-owned Core through the fetch-backed remote adapter. The server remains responsible for provider setup, pin policy, and AWS credentials.

```ts
import { createLambdaRemoteHandler, bootstrapLambdaServer } from "@csbc-dev/lambda/server";

const createCore = () => bootstrapLambdaServer({
	pinPolicy: {
		pinnedFunctionName: "my-safe-function",
		pinnedQualifier: "live",
	},
});

export const handleLambdaRequest = createLambdaRemoteHandler(() => createCore(), {
	authenticate: (request) => request.headers.get("authorization") === `Bearer ${process.env.LAMBDA_PROXY_TOKEN}`,
});
```

Remote endpoints must be protected by application authentication or by the `authenticate` hook shown above. The handler validates the remote command shape, but it does not choose an authorization policy for your application.

Pass a Core factory, as shown above, when one endpoint may receive concurrent requests. A single `LambdaCore` instance intentionally aborts its previous invocation when a new one starts, which is useful for one addressable invocation surface but not for unrelated HTTP requests.

If you intentionally pass a shared Core instance, the handler rejects overlapping requests with `409` and aborts a stuck shared invocation after `sharedCoreTimeoutMs` (default: `300000`) so the endpoint can recover.

On the browser side, attach the custom element to that endpoint.

```ts
const invoke = document.querySelector("lambda-invoke");

invoke?.attachRemote("/api/lambda");
invoke!.payload = { name: "Ada" };

await invoke?.invoke();
```

The browser may still set `functionName` or `qualifier` properties for deployments that explicitly allow it, but the server Core's pin policy is authoritative.

In buffered mode the remote provider exchanges a single JSON request/response.

In stream mode the remote handler responds with an [NDJSON](https://github.com/ndjson/ndjson-spec) body (`content-type: application/x-ndjson`): one JSON object per line — zero or more `{"type":"chunk",...}` events as the Lambda response streams in, terminated by exactly one `{"type":"result",...}` or `{"type":"error",...}` event. The browser provider reads that stream incrementally and projects each chunk as it arrives, so `<lambda-stream>` updates token-by-token and `firstByteLatency` reflects real browser-perceived first-byte latency. The Core still owns transport choice — the browser only sees state — so this is an internal transport, not a contract change ([SPEC §9.2](SPEC.md), [ADR 0001](docs/adr/0001-stream-transport.md)).

> **Backward-compatible fallback.** If the endpoint instead returns one buffered JSON response (an older server, or a deployment whose provider does not stream), the browser provider detects the non-NDJSON content type and replays the returned `chunks` after completion. In that fallback path every chunk — including the first — arrives only after the invocation completes, so `firstByteLatency` is the server-measured value replayed verbatim, not browser-perceived. The public bindable surface is identical either way.

### Three ways to attach the remote Core (browser)

| Mechanism | When | How |
|---|---|---|
| `remote-url` attribute | Per-element, URL known in markup | `<lambda-invoke remote-url="/api/lambda">` — a non-empty value attaches a remote provider; clearing it detaches. Declarative; works with framework `attr`/`ref` bindings. |
| `@csbc-dev/lambda/auto/remoteEnv` | Whole page, URL from the environment | `import "@csbc-dev/lambda/auto/remoteEnv"` — registers the elements and enables env-driven remote mode. Each `<lambda-invoke>` auto-attaches on connect from `process.env.LAMBDA_REMOTE_CORE_URL` (build-time) or `globalThis.LAMBDA_REMOTE_CORE_URL` (runtime, set before the script loads). No URL in markup. |
| `attachRemote(url)` | Imperative / dynamic | `el.attachRemote("/api/lambda")` (or `el.remoteUrl = "..."`). |

An explicit `remote-url` attribute or a prior `setProvider()` takes precedence over env auto-attach — env only fills the gap. The plain `@csbc-dev/lambda/auto` entry registers the elements without enabling remote mode.

## Buffered invoke example

```ts
import { AwsLambdaProvider, LambdaCore } from "@csbc-dev/lambda/server";

const core = new LambdaCore();

core.setProvider(new AwsLambdaProvider({
	policy: {
		pinnedFunctionName: "hello-world",
		pinnedQualifier: "prod",
	},
}));

await core.invoke({
	payload: { name: "Ada" },
});

console.log(core.result);
```

## Stream invoke example

The default AWS SDK-backed provider uses Lambda `InvokeWithResponseStream` when `mode` is `"stream"`.

```ts
import { AwsLambdaProvider, LambdaCore } from "@csbc-dev/lambda/server";

const provider = new AwsLambdaProvider({
	policy: {
		pinnedFunctionName: "chat-stream",
	},
});

const core = new LambdaCore(undefined, provider);
await core.invoke({ mode: "stream", payload: { prompt: "hello" } });

console.log(core.text);
```

For tests, non-AWS runtimes, or server-proxied stream transports, pass a custom `streamInvoker` to `AwsLambdaProvider`.

## Pin policy

`functionName`, `qualifier`, and `logType` are security-sensitive. The safe default is to pin them server-side.

```ts
core.setPinPolicy({
	pinnedFunctionName: "my-safe-function",
	pinnedQualifier: "live",
	pinnedLogType: "None",
});
```

The browser should not be allowed to choose arbitrary Lambda targets unless the server explicitly allows it. `logType` is pinned on the same axis because `Tail` returns the last 4 KB of the function execution log, which can expose runtime environment details. Open each axis explicitly when a deployment needs client selection:

```ts
core.setPinPolicy({
	pinnedFunctionName: "default-function",
	allowFunctionNameOverride: true,
	allowedFunctionNames: ["default-function", "tenant-function"],
	allowQualifierOverride: true,
	allowedQualifiers: ["live", "canary"],
	allowLogTypeOverride: true,
});
```

When an axis is pinned without its override flag, a client-supplied value for that field is **silently ignored** rather than rejected: `el.functionName = "other"` keeps the pinned name, and `el.logType = "Tail"` keeps the pinned log type. The property and `function-name` / `log-type` attributes still exist so the declarative `wc-bindable` contract is uniform across deployments, but the server pin policy — not the browser — is authoritative. Use `allowedFunctionNames` / `allowedQualifiers` (with the matching override flag) when an out-of-policy value should instead surface a `LAMBDA_POLICY_DENIED` error.

## Cancellation

`abort()` cancels local result delivery for the active invocation and passes an `AbortSignal` to providers. If the underlying provider or transport honors that signal, the in-flight request may be cancelled there too. The package does not promise that an already accepted Lambda execution stops on the AWS side.

Starting a new invocation also aborts the previous provider signal and prevents late results from overwriting newer state.

## Deployment: CSP, CORS, and credentials

Because the package is remote-first, the browser only ever talks to your server-owned Core endpoint over `fetch`. Plan the network boundary explicitly.

**Same-origin is the default and the recommended shape.** The examples proxy `/api/lambda` so browser code stays same-origin. `createLambdaRemoteHandler` emits **no** CORS headers of its own — a same-origin deployment needs none, and not emitting them by default avoids accidentally opening the endpoint cross-origin.

**Content Security Policy.** The remote endpoint is reached with `fetch`, so it must be allowed by `connect-src`:

```
Content-Security-Policy: connect-src 'self';
```

Use `'self'` for the same-origin shape. If the Core endpoint is on another origin, add that exact origin (for example `connect-src 'self' https://api.example.com;`). The package loads no remote scripts itself, so it adds no `script-src` requirement beyond your own bundle.

**Cross-origin endpoints (CORS).** If the Core endpoint is on a different origin than the page, the browser will preflight and require CORS headers. `createLambdaRemoteHandler` does not add them, so your HTTP layer must:

- answer `OPTIONS` preflight for the endpoint path
- return `Access-Control-Allow-Origin` for an explicit allowlist of trusted origins (never reflect arbitrary origins, and avoid `*` on an authenticated endpoint)
- allow the `content-type` request header and the `POST` method
- send `Vary: Origin` when the allowed origin is computed per request

The example server in [`examples/server/server.js`](https://github.com/csbc-dev/lambda/blob/main/examples/server/server.js) shows this pattern with an `ALLOWED_ORIGINS` allowlist.

**Credentials mode.** The fetch-backed provider sends requests with the browser default credentials mode and forwards any `headers` you configure. For a token-authenticated endpoint (the `authenticate` hook above), pass the token via a header rather than relying on ambient cookies. If you do authenticate with cookies on a cross-origin endpoint, you must additionally set `Access-Control-Allow-Credentials: true` and a non-wildcard `Access-Control-Allow-Origin`. AWS credentials always stay server-side and are never part of this exchange.

## Error behavior

Transport, configuration, policy, and Lambda function failures are exposed through normalized `LambdaError` objects on `error` or `streamError`.

When AWS reports a Lambda `FunctionError`, the response payload remains available on `result`, `functionError` is populated, and `error.code` is set to `LAMBDA_FUNCTION_ERROR`.