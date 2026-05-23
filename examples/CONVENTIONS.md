# Examples conventions

Rules every example under `examples/` follows. Keep new work compliant; if a
rule must change, change it here first.

## 1. Scope — target frameworks

Exactly four front-end demos of `<lambda-invoke>` (with its `<lambda-stream>`
projection child), each binding the elements a different way (and nothing else —
keep the set focused):

| Example | Binding |
|---|---|
| `vanilla` | plain DOM APIs — custom-element properties + `CustomEvent`s (no adapter; the `bootstrapLambda()` baseline) |
| `react` | [`@wc-bindable/react`](https://www.npmjs.com/package/@wc-bindable/react) `useWcBindable` |
| `vue` | [`@wc-bindable/vue`](https://www.npmjs.com/package/@wc-bindable/vue) `useWcBindable` |
| `wcstack-state` | [`@wcstack/state`](https://www.npmjs.com/package/@wcstack/state) declarative `data-wcs` |

For `react`/`vue` use the **off-the-shelf adapter** — no hand-written binding
glue. `vanilla` deliberately uses raw DOM to show the wc-bindable protocol needs
no adapter at all.

## 2. Architecture — one server, server-owned Core (Case B1)

This package is **CSBC Case B1**: the Core runs on the server and owns every
invocation decision; the browser only issues commands. There is no browser data
plane and no second backend (contrast a Case C package with cross-origin direct
calls).

| Server | Port | Role |
|---|---|---|
| `server/` | 3000 | The **only** backend. Owns `LambdaCore` + the provider and exposes it at `/api/lambda` — the *one* place invocation decisions and AWS calls happen. Also statically serves the `wcstack-state` page and the local build (`/dist`, `/src/auto`, `/shared`). Shared by all. |

- Every example is **remote-first**: the browser attaches to the server-owned
  Core via `remote-url="/api/lambda"` (a `LambdaRemoteProvider`) and never holds
  AWS credentials or a provider.
- The endpoint is **same-origin everywhere**, via a **relative** `/api/lambda`:
  - Vite clients **proxy** `/api/lambda` → `:3000` (`server.proxy` in each
    `vite.config`).
  - `wcstack-state` is served by `:3000` itself.
  - So `remote-url` is the relative `"/api/lambda"` in every example — **never an
    absolute cross-origin URL**.
- **AWS credentials never reach the browser.** They stay in the server-owned
  Core/provider.
- The example server uses a **mock provider**. Swap it for `AwsLambdaProvider`
  (from `@csbc-dev/lambda/server`) for real Lambda — see
  [`server/server.js`](./server/server.js).
- The server sets CORS headers for `ALLOWED_ORIGINS` and answers `OPTIONS` as a
  safety net, but the canonical browser path is same-origin (proxy, or served by
  `:3000`), so CORS is not the primary mechanism.

## 3. Run model — dev server proxy; build optional

- `vanilla` / `react` / `vue` are **Vite projects**. The canonical local run is
  the **Vite dev server** (`npm run dev`) on its fixed port, proxying
  `/api/lambda` to `:3000`. `npm run build` → `dist/` (then `npm run preview`) is
  supported, but each client serves its own `dist/` — the shared `server/` does
  **not** serve the Vite builds.
- Start `server/` **first**: it owns the Core every example calls. It is
  dependency-free apart from the workspace package (`@csbc-dev/lambda`), Node
  built-ins only.
- `wcstack-state` has **no build step** (see §4).

## 4. `wcstack-state` specifics

- **Single self-contained file** — one `index.html`, no build, **no server-side
  injection**. The shared `server/` serves it verbatim. Everything (markup,
  inline state, bound elements, config) lives in that one file.
- **Fully declarative** — `data-wcs` only. No `querySelector`, no `setProvider`,
  no framework glue:
  - Inputs/outputs via `data-wcs` on `<lambda-invoke>` (parent) and
    `<lambda-stream>` (child).
  - Commands via tokens: `$commandTokens` + `command.<name>: $command.X`.
  - Remote attach via `attr.remote-url` (the element attaches a
    `LambdaRemoteProvider` for that URL — editing the field re-attaches).
- **CDN-based**:
  - `@wcstack/state` → `https://esm.run/@wcstack/state@1.10.0/auto`.
  - `@csbc-dev/lambda` → `https://esm.run/@csbc-dev/lambda/auto` **once it is
    published to npm**. Until then, the shared `server/` serves the local build
    and `index.html` loads `../../src/auto/auto.js` (which imports `../../dist`);
    the server exposes `/src/auto/` and `/dist/` same-origin. Swap the script
    `src` to the CDN URL after publishing.
- **`wcs-state` defined inline** via `<script type="module">export default {…}</script>`.
- **Mirrors the `ai-agent` (local) and `auth0` (remote) `@wcstack/state`
  examples**: state owns plain values + getters + command emits; the element owns
  the async invocation. Track the latest `@wcstack/state` spec (currently
  `1.10.x`) and keep `data-wcs` usage in sync when it changes.

## 5. Source of truth — parent owns, child projects

Match the package contract (SPEC §6/§7) in every example:

- Inputs (`functionName`, `payload`, `mode`, …), commands (`invoke`/`abort`/
  `reset`), and common/buffered state (`invoking`, `result`, `error`,
  `requestId`, `duration`) live on the parent `<lambda-invoke>`.
- Streaming output (`streaming`, `text`, `chunks`, `done`, `firstByteLatency`,
  `streamError`) is read from the `<lambda-stream>` **child** — a projection
  shell, never a second authority. Don't re-read stream output off the parent.

## 6. Ports & origins

Ports are **fixed**. Each Vite origin MUST be in the server's `ALLOWED_ORIGINS`
(defaults in [`server/server.js`](./server/server.js);
override via [`server/.env.example`](./server/.env.example)).

| Project | Port |
|---|---|
| `server` | 3000 |
| `vanilla` | 5173 |
| `react` | 5174 |
| `vue` | 5175 |
| `wcstack-state` | 3000 (served by `server`) |

Changing a port means changing it in that client's `vite.config` (`server.port`;
the proxy target stays `:3000`) **and** the server allow-list.

## 7. Demo-only shortcuts (never ship)

These keep the demos small; production must replace them:

- **Mock provider** in `server/server.js` — replace with `AwsLambdaProvider`.
- `/api/lambda` is **unauthenticated** — production must pass
  `createLambdaRemoteHandler` an `authenticate` hook (or front it with app auth).
- `functionName` / `qualifier` are driven from **browser fields** — production
  pins them server-side via `setPinPolicy` (and pins `logType`); the browser pin
  policy is never authoritative.
- A new `LambdaCore` is created **per request** (Core factory) — fine for the
  demo's one-shot calls; not a shared dispatcher.

## 8. Adding a new example

1. **Vite framework**: create the project; use its `@wc-bindable/*` adapter (or
   plain DOM, vanilla-style); set `remote-url="/api/lambda"`; add
   `proxy: { "/api/lambda": "http://localhost:3000" }` and a fixed `server.port`
   to `vite.config`; add the origin to the server allow-list; reuse `../shared`
   for css/format.
2. **Declarative (wcstack-style)**: a single self-contained CDN file with inline
   `wcs-state` and `attr.remote-url`, served by `server/`.

## Layout

```
examples/
  server/         shared backend (3000) — LambdaCore + provider at /api/lambda;
                  also serves wcstack-state, /dist, /src/auto, /shared
  shared/         demo.css + format.js (front-end helpers reused by all)
  vanilla/        Vite + plain DOM APIs            (5173, dev/preview)
  react/          Vite + @wc-bindable/react        (5174, dev/preview)
  vue/            Vite + @wc-bindable/vue          (5175, dev/preview)
  wcstack-state/  single CDN file + @wcstack/state (no build; served by server)
  index.html      landing page linking the four demos
```

See [README.md](./README.md) for run instructions.
