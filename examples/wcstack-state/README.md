# @wcstack/state example

Static HTML page that uses `data-wcs` declarative bindings and command tokens to drive `<lambda-invoke>`. No bundler — the custom elements self-register via a side-effect `<script src>` to `@csbc-dev/lambda/auto`, exactly like `@wcstack/state/auto`. Pre-publish that resolves to the local `../../src/auto/auto.js` (which imports the `../../dist` build); after npm publish it becomes `https://esm.run/@csbc-dev/lambda/auto`.

This example is **remote-first**: it attaches to a server-owned `LambdaCore` at `/api/lambda` declaratively through `attr.remote-url`, so the page has no provider object, no element lookup, and no imperative `setProvider()`. AWS credentials never reach the browser — the provider lives in the server's Core.

## Setup

Build the workspace package first so `dist/` exists:

```bash
npm install
npm run build
```

Then start [`../server`](../server/) (it serves `/api/lambda`, the `/dist/` build, and `../shared` assets same-origin) and open:

```text
http://localhost:3000/wcstack-state/
```

## What this example demonstrates

- **`data-wcs` directly on `<lambda-invoke>`** — `functionName` / `mode` / `payload` are store-driven inputs; `invoking` / `result` / `error` / `requestId` / `duration` are outputs mirrored back into the store.
- **`attr.remote-url`** — binding the endpoint to the `remote-url` attribute attaches the remote provider declaratively; editing the field re-attaches with no imperative call.
- **Command tokens** — `invoke` / `abort` / `reset` fire through `$command` tokens bound with `command.<name>:`, so the state never references the element by id.
- **Child projection** — the `<lambda-stream>` child mirrors the parent's `streaming` / `text` / `streamError` for the streaming view.
- **Side-effect auto entry** — `@csbc-dev/lambda/auto` registers the elements with no `bootstrapLambda()` call in the page, mirroring `@wcstack/state/auto` and the auth0 / ai-agent examples.
