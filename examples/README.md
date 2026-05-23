# `@csbc-dev/lambda` examples

Four runnable browser examples that match the build shape used by `@csbc-dev/auth0`:

| Example | Stack | Demonstrates |
|---------|-------|--------------|
| [`vanilla/`](vanilla/) | Vite + plain DOM APIs | Direct custom-element properties and events |
| [`react/`](react/) | Vite + React + `@wc-bindable/react` | `useWcBindable` hook around `<lambda-invoke>` |
| [`vue/`](vue/) | Vite + Vue + `@wc-bindable/vue` | `useWcBindable` composable around `<lambda-invoke>` |
| [`wcstack-state/`](wcstack-state/) | Static HTML + CDN `<wcs-state>` | Declarative remote-first bindings (`attr.remote-url`) |

The Vite clients and example server use the local package via `file:../..`, while `wcstack-state/` stays bundler-free and loads the local build through `@csbc-dev/lambda/auto`. All four examples are **remote-first**: they talk to a server-owned `LambdaCore` at `/api/lambda` via the `remote-url` attribute, so AWS credentials never reach the browser. `wcstack-state/` wires it declaratively (`attr.remote-url`); the Vite clients set the same attribute imperatively.

The example server scripts require Node 20.6+ because they use `node --env-file=...`.

Before running any example, build the workspace package once so the local package exports and `dist/` are available:

```bash
npm install
npm run build
```

## Run order

Every example is remote-first, so start the shared server first — it owns the `LambdaCore` and provider at `/api/lambda`:

```bash
cd examples/server
npm install
npm run dev                # http://localhost:3000/api/lambda
```

`PORT` and `ALLOWED_ORIGINS` already have defaults in `server.js`, so `.env` is optional. Create it from `.env.example` only when you need custom values.

Then pick any Vite client:

```bash
cd examples/vanilla        # or react/, or vue/
npm install
npm run dev
```

`wcstack-state/` is remote-first: it attaches to the server-owned Core at `/api/lambda` through `attr.remote-url`, so run it through the example server (which also serves the local `/dist/` build same-origin). Start the server above, then open:

```text
http://localhost:3000/wcstack-state/
```

## Build clients

Each Vite client builds independently:

```bash
cd examples/vanilla && npm run build
cd examples/react && npm run build
cd examples/vue && npm run build
```

## Port assignments

| Project | Port |
|---------|------|
| `server` | 3000 |
| `vanilla` | 5173 |
| `react` | 5174 |
| `vue` | 5175 |
| `wcstack-state` | 3000 (served by `examples/server`) |

The default server `ALLOWED_ORIGINS` already lists `5173`-`5176` and `3000`. The Vite clients proxy `/api/lambda` to the shared server, so their remote endpoint can stay same-origin from browser code.

## What the clients demonstrate

- Remote-first invocation through a server-owned `LambdaCore` at `/api/lambda`, with no AWS credentials in the browser.
- Attaching the remote Core via the `remote-url` attribute — declaratively in `wcstack-state/` (`attr.remote-url`), imperatively in the Vite clients.
- Streaming output read from the `<lambda-stream>` child projection in all four clients.
- `invoke`, `abort`, and `reset` command behavior through framework-specific bindings.

The remote endpoint must keep AWS credentials server-side. The included server uses a mock provider; replace it with `AwsLambdaProvider` from `@csbc-dev/lambda/server` for real Lambda calls.