# @csbc-dev/lambda

Declarative AWS Lambda invocation components for Web Components, shaped by CSBC and `wc-bindable-protocol`.

## Current state

This repository is in alpha implementation.

- Parent authority tag: `<lambda-invoke>`
- Child stream projection tag: `<lambda-stream>`
- Buffered invoke: implemented through `AwsLambdaProvider`
- Stream invoke: implemented through AWS `InvokeWithResponseStream`; custom transports can still be injected through `streamInvoker`
- Remote invocation: implemented through a fetch-backed browser provider and server-owned Core handler

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

The fetch-backed remote provider returns a single JSON response. In stream mode it replays any returned `chunks` into the stream observer after the server invocation completes; it is not a real-time browser streaming transport. Use a custom provider or future streaming transport when first-byte delivery to the browser matters.

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

`functionName` and `qualifier` are security-sensitive. The safe default is to pin them server-side.

```ts
core.setPinPolicy({
	pinnedFunctionName: "my-safe-function",
	pinnedQualifier: "live",
});
```

The browser should not be allowed to choose arbitrary Lambda targets unless the server explicitly allows it.

## Cancellation

`abort()` cancels local result delivery for the active invocation and passes an `AbortSignal` to providers. If the underlying provider or transport honors that signal, the in-flight request may be cancelled there too. The package does not promise that an already accepted Lambda execution stops on the AWS side.

Starting a new invocation also aborts the previous provider signal and prevents late results from overwriting newer state.

## Error behavior

Transport, configuration, policy, and Lambda function failures are exposed through normalized `LambdaError` objects on `error` or `streamError`.

When AWS reports a Lambda `FunctionError`, the response payload remains available on `result`, `functionError` is populated, and `error.code` is set to `LAMBDA_FUNCTION_ERROR`.