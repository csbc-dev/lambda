# `@csbc-dev/lambda` examples

Four runnable browser examples that match the build shape used by `@csbc-dev/auth0`:

| Example | Stack | Demonstrates |
|---------|-------|--------------|
| [`vanilla/`](vanilla/) | Vite + plain DOM APIs | Direct custom-element properties and events |
| [`react/`](react/) | Vite + React + `@wc-bindable/react` | `useWcBindable` hook around `<lambda-invoke>` |
| [`vue/`](vue/) | Vite + Vue + `@wc-bindable/vue` | `useWcBindable` composable around `<lambda-invoke>` |
| [`wcstack-state/`](wcstack-state/) | Static HTML + CDN `<wcs-state>` | Declarative path and command bindings |

The Vite clients import `@csbc-dev/lambda` from npm, while `wcstack-state/` stays bundler-free and imports the package from a CDN. Every example defaults to a browser-only mock provider and can switch to remote mode through `/api/lambda`.

## Run order

Start the shared mock server first if you want to use remote mode:

```bash
cd examples/server
cp .env.example .env
npm install
npm run dev                # http://localhost:3000/api/lambda
```

Then pick any Vite client:

```bash
cd examples/vanilla        # or react/, or vue/
npm install
npm run dev
```

For `wcstack-state/`, use either mock mode from any static server, or open it through the example server when you want same-origin remote mode:

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