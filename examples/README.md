# `@csbc-dev/lambda` examples

Four runnable browser examples that match the build shape used by `@csbc-dev/auth0`:

| Example | Stack | Demonstrates |
|---------|-------|--------------|
| [`vanilla/`](vanilla/) | Vite + plain DOM APIs | Direct custom-element properties and events |
| [`react/`](react/) | Vite + React + `@wc-bindable/react` | `useWcBindable` hook around `<lambda-invoke>` |
| [`vue/`](vue/) | Vite + Vue + `@wc-bindable/vue` | `useWcBindable` composable around `<lambda-invoke>` |
| [`wcstack-state/`](wcstack-state/) | Static HTML + CDN `<wcs-state>` | Declarative path and command bindings |

The Vite clients and example server use the local package via `file:../..`, while `wcstack-state/` stays bundler-free and reads the local `dist/` build. Every example defaults to a browser-only mock provider and can switch to remote mode through `/api/lambda`.

The example server scripts require Node 20.6+ because they use `node --env-file=...`.

Before running any example, build the workspace package once so the local package exports and `dist/` are available:

```bash
npm install
npm run build
```

## Run order

Start the shared mock server first if you want to use remote mode:

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

For `wcstack-state/`, use either mock mode from a static server that exposes both the repository root and `/dist/`, or open it through the example server when you want same-origin remote mode and a locally served `/dist/` build:

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
| `wcstack-state` | 3000 when served by `examples/server`, otherwise your chosen static-server port |

The default server `ALLOWED_ORIGINS` already lists `5173`-`5176` and `3000`. The Vite clients proxy `/api/lambda` to the shared server, so their remote endpoint can stay same-origin from browser code.

## What all four clients demonstrate

- Local mock mode with no AWS credentials in the browser.
- Remote mode through a server-owned `LambdaCore` at `/api/lambda`.
- Same-origin endpoint validation before payloads are posted.
- `invoke`, `abort`, and `reset` command behavior through framework-specific bindings.

The remote endpoint must keep AWS credentials server-side. The included server uses a mock provider; replace it with `AwsLambdaProvider` from `@csbc-dev/lambda/server` for real Lambda calls.