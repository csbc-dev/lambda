# CLAUDE.md

This repository (`@csbc-dev/lambda`) is intended to become a re-packaged member of the `csbc-dev/arch` architecture family. The design target is a declarative AWS Lambda invocation component built on top of `wc-bindable-protocol` and shaped by the same CSBC rules used in the neighboring `ai-agent`, `auth0`, and `s3-uploader` packages.

The implementation is not scaffolded in this repository yet. This document therefore serves two purposes:

1. preserve the architectural intent before code lands, and
2. define the boundaries that future implementation work should follow.

---

## 1. Overview of wc-bindable-protocol

A framework-agnostic, minimal protocol that lets any class extending `EventTarget` declare its reactive properties. Reactivity systems in React / Vue / Svelte / Angular / Solid can then bind to arbitrary components without framework-specific glue code.

### Core idea

- The component author declares **what** is bindable.
- The framework consumer decides **how** to bind it.
- Neither side needs to know about the other.

### How to declare

Just write a schema in the `static wcBindable` field.

```javascript
class MyFetchCore extends EventTarget {
  static wcBindable = {
    protocol: "wc-bindable",
    version: 1,
    properties: [
      { name: "value", event: "my-fetch:value-changed" },
      { name: "loading", event: "my-fetch:loading-changed" },
    ],
    inputs: [{ name: "url" }, { name: "method" }],
    commands: [{ name: "fetch", async: true }, { name: "abort" }],
  };
}
```

| Field | Required | Role |
|---|---|---|
| `properties` | Yes | Properties that announce state changes via `CustomEvent` (output) |
| `inputs` | No | Configurable properties (input; declaration only, no automatic sync) |
| `commands` | No | Invokable methods (for remote proxies and tooling) |

### How binding works

An adapter only needs to:

1. Read `target.constructor.wcBindable`
2. Verify `protocol === "wc-bindable" && version === 1`
3. For each `property`, read `target[name]` immediately to deliver the initial value, then subscribe to `event`

`bind()` is at most around 20 lines. Framework adapters fit in a few dozen lines.

### Out of scope (deliberately)

- Automatic two-way sync
- Form integration
- SSR / hydration
- Runtime schema validation beyond what a package performs for its own inputs

### Why `EventTarget`

Requiring `EventTarget` rather than `HTMLElement` lets the same protocol work in non-browser runtimes such as Node.js / Deno / Cloudflare Workers. `HTMLElement` is a subclass of `EventTarget`, so Web Components are automatically compatible.

Reference: [wc-bindable-protocol/SPEC.md](https://github.com/wc-bindable-protocol/wc-bindable-protocol/blob/main/SPEC.md)

---

## 2. Overview of the Core/Shell Bindable Component (CSBC) architecture

Built on top of wc-bindable-protocol, CSBC structurally eliminates framework lock-in by moving business logic, especially async work, out of the framework layer and into the Web Component side.

### The problem it solves

The real migration cost in frontend systems is not templates but async logic coupled to framework lifecycle APIs such as `useEffect`, `onMounted`, and `onMount`. Templates can usually be rewritten mechanically. Async orchestration cannot.

### Three-layer structure

1. **Headless Web Component layer** - encapsulates async work (HTTP, WebSocket, timers, retries, state transitions) and state (`value`, `loading`, `error`, etc.).
2. **Protocol layer (wc-bindable-protocol)** - exposes the state through `static wcBindable` and `CustomEvent`.
3. **Framework layer** - binds to the protocol and renders state. No domain async logic belongs here.

### Core / Shell separation

The headless layer is split into two parts. The invariant is not that the Shell must always be thin. The invariant is where decisions live.

- **Core (`EventTarget`) - owns decisions**
  Business logic, policy, request shaping, timeout and retry rules, authorization-sensitive behavior, state transitions, event emission.
- **Shell (`HTMLElement`) - owns only undelegatable execution**
  DOM lifecycle, framework-facing attributes and properties, local trigger wiring, transport setup.

The enabling pattern is **target injection**: the Core constructor accepts an arbitrary `EventTarget` and dispatches all events to it. When the Shell passes `this`, Core events fire directly from the DOM element with no re-dispatch layer.

### Four canonical cases

| Case | Core location | Shell role | Examples |
|---|---|---|---|
| A | Browser | Thin wrapper around a browser-bound Core | `auth0-gate` (local) |
| B1 | Server | Command-mediating thin Shell | `ai-agent` (remote) |
| B2 | Server | Observation-only thin Shell | `feature-flags` |
| C | Server | Browser-anchored execution Shell | `s3-uploader`, `passkey-auth`, `stripe-checkout` |

### Where Lambda fits

`@csbc-dev/lambda` should be designed as **Case B1**.

- The **Core** should live in a privileged runtime and own every invocation decision: function selection, alias / qualifier handling, request shaping, idempotency, timeout policy, retry policy, payload serialization, response normalization, and error taxonomy.
- The **Shell** should remain a thin browser-facing command surface: it maps attributes and properties, forwards `invoke()` / `abort()` to the remote Core, and exposes result state locally through wc-bindable-protocol.
- **AWS credentials must never reach the browser.** Any IAM authorization, SigV4 signing, or provider-specific client setup belongs in the Core or in a provider object owned by the Core.

This package is intentionally **not** Case C. There is no browser-only data plane comparable to direct S3 upload. Lambda invocation is control-plane work, so the browser should not own the execution path beyond issuing commands to a remote Core.

> Invariant:
> **The Core owns every decision. The Shell owns only execution that cannot be delegated.**

### Three boundaries it crosses

| Boundary | Crossing actor | Mechanism |
|---|---|---|
| Runtime boundary | Core (`EventTarget`) | DOM-free code running in Node.js / Deno / Workers |
| Framework boundary | Shell (`HTMLElement`) | Attribute mapping + `ref` binding |
| Network boundary | `@wc-bindable/remote` | Proxy `EventTarget` + JSON wire protocol |

Reference: [csbc-dev/arch](https://github.com/csbc-dev/arch/blob/main/README.md)

---

## 3. Target package shape for `@csbc-dev/lambda`

This section describes the intended implementation target for the repository.

### Package intent

`@csbc-dev/lambda` should be a declarative Lambda invocation component. It is not a visual widget. It is an I/O node that connects framework code to remote function invocation state.

The intended default mode is **remote-first**:

- Browser code talks to an authoritative parent tag, `<lambda-invoke>`
- Optional specialized output is projected through child tags such as `<lambda-stream>`
- The Shell proxies through `@wc-bindable/remote`
- The server-side Core invokes AWS Lambda and emits bindable state transitions

### Intended bindable surface

The package should expose a parent and child contract with a single source of truth in the parent and Core.

Parent tag, `<lambda-invoke>`:

| Kind | Names |
|---|---|
| properties | `invoking`, `result`, `error`, `duration`, `requestId`, `statusCode`, `functionError`, `executedVersion`, `logResult`, `mode` |
| inputs | `functionName`, `payload`, `qualifier`, `clientContext`, `logType` |
| commands | `invoke` (async), `abort`, `reset` |

Child tag, `<lambda-stream>`:

| Kind | Names |
|---|---|
| properties | `streaming`, `chunks`, `text`, `done`, `firstByteLatency`, `streamError` |

The child is a projection shell only. Inputs and commands remain parent-owned.

### Responsibility split

- **Core responsibilities**
  - Validate invocation inputs
  - Select the provider / invoker implementation
  - Enforce timeout and retry policy
  - Normalize AWS SDK or HTTP errors into a stable package-level error shape
  - Capture response metadata (`StatusCode`, `FunctionError`, `ExecutedVersion`, request ID)
  - Emit all bindable state transitions

- **Shell responsibilities**
  - Let the parent Shell own DOM lifecycle, parent-child coordination, and remote Core proxy attachment
  - Let the parent expose inputs and commands to application code
  - Let child Shells such as `<lambda-stream>` attach to the parent and project specialized output only
  - Keep invocation authority, transport choice, and authorization policy out of all Shells

### Suggested source layout

```text
src/
|- index.ts
|- bootstrapLambda.ts
|- registerComponents.ts
|- config.ts
|- autoTrigger.ts
|- types.ts
|- raiseError.ts
|- core/
|  \- LambdaCore.ts
|- components/
|  |- LambdaInvoke.ts
|  \- LambdaStream.ts
|- providers/
|  \- AwsLambdaProvider.ts
|- server/
|  \- index.ts
\- auto/
   |- auto.js
   \- remoteEnv.js
```

### Implementation constraints

- Keep the Core transport-agnostic. The package should depend on an abstraction such as `ILambdaProvider` rather than hard-coding one AWS client path everywhere.
- Keep browser code free of AWS credentials and provider secrets.
- Treat response payload decoding, base64 log decoding, and error normalization as Core concerns.
- If cancellation cannot abort an in-flight provider call at the transport layer, define `abort()` as cancellation of local result delivery and make that limitation explicit in the README.
- Prefer one Core instance per addressable invocation surface, not a global dispatcher.

### Release readiness note

This repository does not yet contain the implementation artifacts that neighboring packages already ship (`package.json`, `src/`, tests, build scripts). Until those exist, release work is limited to scaffolding and documentation. The release skill in `.claude/skills/release/SKILL.md` explicitly checks for those prerequisites and stops if they are absent.