# @csbc-dev/lambda

Declarative AWS Lambda invocation components for Web Components, shaped by CSBC and `wc-bindable-protocol`.

## Current state

This repository is in alpha implementation.

- Parent authority tag: `<lambda-invoke>`
- Child stream projection tag: `<lambda-stream>`
- Buffered invoke: implemented through `AwsLambdaProvider`
- Stream invoke: implemented through AWS `InvokeWithResponseStream`; custom transports can still be injected through `streamInvoker`
- Remote invocation: implemented through a fetch-backed browser provider and server-owned Core handler

The design intent is documented in [CLAUDE.md](CLAUDE.md) and the package contract is fixed in [SPEC.md](SPEC.md).

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

const core = bootstrapLambdaServer({
	pinPolicy: {
		pinnedFunctionName: "my-safe-function",
		pinnedQualifier: "live",
	},
});

export const handleLambdaRequest = createLambdaRemoteHandler(core);
```

On the browser side, attach the custom element to that endpoint.

```ts
const invoke = document.querySelector("lambda-invoke");

invoke?.attachRemote("/api/lambda");
invoke!.payload = { name: "Ada" };

await invoke?.invoke();
```

The browser may still set `functionName` or `qualifier` properties for deployments that explicitly allow it, but the server Core's pin policy is authoritative.

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