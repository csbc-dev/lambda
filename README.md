# @csbc-dev/lambda

Declarative AWS Lambda invocation components for Web Components, shaped by CSBC and `wc-bindable-protocol`.

## Current state

This repository is still in early scaffolding.

- Parent authority tag: `<lambda-invoke>`
- Child stream projection tag: `<lambda-stream>`
- Buffered invoke: scaffolded through `AwsLambdaProvider`
- Stream invoke: contract is in place; transport implementation is injected through `streamInvoker`

The design intent is documented in [CLAUDE.md](CLAUDE.md) and the package contract is fixed in [SPEC.md](SPEC.md).

## Install

```bash
npm install @csbc-dev/lambda
```

## Browser-side shape

```html
<lambda-invoke id="chat" mode="stream"></lambda-invoke>
<lambda-stream></lambda-stream>
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

The package exposes a stream contract even though the default AWS SDK-backed provider does not implement streaming by itself yet. To enable stream mode, inject a `streamInvoker`.

```ts
import { AwsLambdaProvider, LambdaCore } from "@csbc-dev/lambda/server";

const provider = new AwsLambdaProvider({
	policy: {
		pinnedFunctionName: "chat-stream",
	},
	async streamInvoker(options, observer) {
		const chunks = ["Hel", "lo", " world"];
		const startedAt = Date.now();

		for (const [index, chunk] of chunks.entries()) {
			observer.onChunk({
				chunk,
				textDelta: chunk,
				firstByteLatency: index === 0 ? Date.now() - startedAt : undefined,
			});
		}

		return {
			result: { ok: true },
			statusCode: 200,
			functionError: null,
			executedVersion: options.qualifier ?? null,
			requestId: "example-request-id",
			logResult: null,
			chunks,
			text: chunks.join(""),
			firstByteLatency: 0,
		};
	},
});

const core = new LambdaCore(undefined, provider);
await core.invoke({ mode: "stream", payload: { prompt: "hello" } });

console.log(core.text);
```

## Pin policy

`functionName` and `qualifier` are security-sensitive. The safe default is to pin them server-side.

```ts
core.setPinPolicy({
	pinnedFunctionName: "my-safe-function",
	pinnedQualifier: "live",
});
```

The browser should not be allowed to choose arbitrary Lambda targets unless the server explicitly allows it.