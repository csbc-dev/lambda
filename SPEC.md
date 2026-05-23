# Lambda Component SPEC

This document defines the design contract for the `@csbc-dev/lambda` package before implementation exists.

The package target is a declarative AWS Lambda invocation component built with CSBC and `wc-bindable-protocol`. The package is **remote-first**: invocation authority stays in a privileged runtime, while browser-side custom elements expose bindable state and commands.

## 1. Scope

This SPEC covers:

- the public component model
- Core and Shell responsibilities
- the parent and child tag relationship
- bindable state and command contracts
- transport and security invariants
- error, cancellation, and lifecycle expectations

This SPEC does not cover:

- exact file layout or build tooling
- AWS SDK implementation details
- packaging and release workflow
- job orchestration beyond direct Lambda invocation

## 2. Problem statement

The package should let application code invoke AWS Lambda functions declaratively without exposing AWS credentials or framework-specific async orchestration to the browser layer.

The design goals are:

1. keep invocation decisions in a remote Core
2. expose a stable bindable surface for framework adapters
3. support both buffered and streaming results without fragmenting the package into unrelated top-level tags
4. preserve a strict authorization boundary around `functionName` and `qualifier`

## 3. Quality priorities

The intended priority order is:

1. security of the invocation boundary
2. evolvability of the public bindable contract
3. transport flexibility
4. rendering efficiency for streaming output
5. implementation convenience

Design decisions in this document should be read through that ordering.

## 4. Architectural model

`@csbc-dev/lambda` is a **CSBC Case B1** package.

- The **Core** runs in a privileged runtime and owns all invocation decisions.
- The **parent Shell** is the browser-facing invocation surface.
- The **child Shell** is an optional projection of a specialized result mode, not an authority-bearing component.

The package therefore uses a **parent and child tag** model:

```html
<lambda-invoke mode="buffered"></lambda-invoke>

<lambda-invoke mode="stream">
  <lambda-stream></lambda-stream>
</lambda-invoke>
```

The parent tag is always the source of truth. Child tags never own invocation authority.

## 5. Component roles

### 5.1 Parent tag: `<lambda-invoke>`

`<lambda-invoke>` is the authoritative custom element for Lambda invocation.

It is responsible for:

- exposing the public input surface
- exposing common invocation state
- owning the remote Core proxy connection
- starting commands such as `invoke()` and `abort()`
- holding the active invocation mode
- enforcing the parent-child relationship for subordinate tags

The parent may support multiple result modes, but those modes do not change the rule that the parent owns inputs and commands.

### 5.2 Child tag: `<lambda-stream>`

`<lambda-stream>` is an optional specialized Shell attached to the nearest or explicitly targeted `<lambda-invoke>`.

It is responsible for:

- exposing streaming-specific output state
- coalescing high-frequency chunk updates to avoid render thrash
- projecting stream-oriented state from the same invocation authority already owned by the parent

It is not responsible for:

- choosing the Lambda function
- choosing the transport
- issuing `invoke()` directly against AWS
- carrying credentials
- owning common request lifecycle state

`<lambda-stream>` is therefore a **projection shell**, not a peer invocation tag.

## 6. Source of truth

The package must maintain a single source of truth for invocation state.

- Inputs live on the parent.
- Commands live on the parent.
- Common request metadata lives on the parent.
- Streaming projection state lives on the child.
- Business decisions always live in the Core.

The following state must not be duplicated as independently writable state across parent and child:

- `functionName`
- `qualifier`
- `payload`
- `loading` or `invoking`
- `error`
- request identifiers

Child components may mirror read-only derived values but must not become a second authority.

## 7. Public contract

### 7.1 Parent bindable surface

The initial public contract for `<lambda-invoke>` should be:

| Kind | Name | Notes |
|---|---|---|
| property | `invoking` | `true` while an invocation is active from the parent's perspective |
| property | `loading` | Alias or equivalent compatibility surface if needed; avoid exposing both unless there is a clear reason |
| property | `result` | Buffered result payload for non-streaming mode |
| property | `error` | Normalized package-level error object or `null` |
| property | `duration` | End-to-end measured duration from the package perspective |
| property | `requestId` | Invocation-correlated identifier when available |
| property | `statusCode` | Lambda response status when available |
| property | `functionError` | Lambda function error indicator when available |
| property | `executedVersion` | Executed alias or version when available |
| property | `logResult` | Tail log data when explicitly requested and available |
| property | `mode` | Effective invocation mode, such as `buffered` or `stream` |
| input | `functionName` | Publicly settable only if the server-side Core policy allows it |
| input | `payload` | Invocation payload |
| input | `qualifier` | Publicly settable only if the server-side Core policy allows it |
| input | `clientContext` | Optional metadata if the chosen invocation mode supports it |
| input | `logType` | Typically `None` or `Tail` where relevant |
| command | `invoke` | Starts an invocation asynchronously |
| command | `abort` | Aborts local delivery and active forwarding where possible |
| command | `reset` | Clears local surfaced state |

The final set may be trimmed during implementation, but new surfaces should be added only with an explicit compatibility decision.

### 7.2 Child bindable surface

The initial public contract for `<lambda-stream>` should be:

| Kind | Name | Notes |
|---|---|---|
| property | `streaming` | `true` while stream chunks are still arriving |
| property | `chunks` | Ordered chunk list or chunk-like projection |
| property | `text` | Accumulated textual projection when the stream is textual |
| property | `done` | `true` once the stream is terminal |
| property | `firstByteLatency` | Time to first streamed chunk |
| property | `streamError` | Streaming-specific projection error if the child exposes one |

The child should avoid re-exposing parent-owned fields unless they are clearly read-only projections.

## 8. Parent-child connection contract

By default, `<lambda-stream>` attaches to the nearest ancestor `<lambda-invoke>`.

The package may additionally support explicit targeting, for example through `for` or `target`, but the semantics must be defined as an alternative connection mechanism, not a second source of truth.

If the child cannot find a valid parent:

- it must not invoke AWS directly
- it must enter a safe inert state
- it should publish a normal package error state rather than crashing the page

Whether that error is surfaced on the child, the parent, or both should be decided once and documented consistently.

## 9. Invocation modes

The package distinguishes **result modes**, not separate authority-bearing top-level products.

### 9.1 Buffered mode

Buffered mode is the baseline.

- The parent invokes the remote Core.
- The Core returns a buffered result.
- The parent exposes `result`, `error`, `duration`, `requestId`, and related metadata.
- No child tag is required.

### 9.2 Stream mode

Stream mode is an extension of the same invocation family.

- The parent still owns inputs, commands, and common metadata.
- The child exposes the stream-oriented output surface.
- The Core chooses the transport strategy.
- The child must treat transport as an implementation detail.

Examples of acceptable transport strategies include:

- a server-proxied stream
- a direct browser stream against a presigned endpoint

The public contract must not depend on which one is selected.

### 9.3 Async fire-and-forget mode

Async fire-and-forget invocation is not the primary shape of this package.

If later required, it should be treated as a separate orchestration problem and evaluated independently. It must not distort the core parent-child design for buffered and streaming invocation.

## 10. Security invariants

The following rules are mandatory.

### 10.1 Credentials never reach the browser

AWS credentials, SigV4 signing keys, and provider-specific secrets must remain in the privileged runtime.

### 10.2 Function pinning is the default safety posture

`functionName` and `qualifier` are security-sensitive inputs.

The server-side Core must support policy-based pinning so that clients cannot freely select any Lambda function reachable by the server's IAM role.

A safe deployment should default to one of these models:

- pinned `functionName` and optional pinned `qualifier`
- server-side allowlist with explicit validation

Unbounded client selection of arbitrary function names is not a safe default.

### 10.3 Payload is the intended caller-controlled input

In the general case, `payload` is the main user-controlled input surface. It must still be validated by the Core or provider layer according to deployment policy.

## 11. Core responsibilities

The Core owns all decisions, including:

- validating inputs
- applying pinning and authorization policy
- selecting the invocation strategy
- selecting the transport strategy for stream mode
- starting and tracking invocations
- normalizing Lambda and transport errors
- capturing response metadata
- publishing bindable state transitions
- executing post-invocation hooks

The Core must remain the only component allowed to make business or security decisions.

## 12. Shell responsibilities

### 12.1 Parent Shell responsibilities

- DOM lifecycle
- attribute and property reflection
- Core proxy attachment
- command exposure
- common bindable state exposure
- child coordination

### 12.2 Child Shell responsibilities

- subscribing to the parent's invocation family
- projecting streaming output
- coalescing chunk updates for rendering efficiency
- surfacing child-local derived state

Neither Shell may own authorization policy.

## 13. Error contract

The package should expose a normalized package-level error shape rather than leaking raw AWS SDK errors directly as the public contract.

At minimum, errors should distinguish:

- configuration or precondition failures
- authorization or policy failures
- invocation transport failures
- Lambda service failures
- Lambda function failures
- local attachment failures such as a missing parent for `<lambda-stream>`

The parent owns the common invocation error surface. The child may expose a streaming-specific projection error if needed, but must not create a second incompatible error taxonomy.

## 14. Cancellation contract

`abort()` does not imply that an already accepted Lambda execution will stop on the AWS side.

The package contract should define `abort()` as:

- cancelling local forwarding where possible
- stopping local state updates for the active consumer where appropriate
- moving the surfaced UI state out of the active invocation state

The package must not imply cost-saving cancellation semantics that AWS Lambda does not actually provide.

## 15. Post-invocation hook contract

The package may support a post-invocation hook such as `registerPostInvoke`.

Its purpose is to support server-side follow-up work such as:

- audit logging
- usage recording
- result caching
- billing and metering side effects
- retry observation

The hook context must distinguish between:

- fields the package can always know authoritatively
- fields that are available only when the invocation path or function response explicitly supplies them

A safe baseline context is:

```ts
type PostInvokeContext = {
  functionName: string;
  qualifier: string | null;
  requestId: string | null;
  duration: number | null;
  statusCode: number | null;
  functionError: string | null;
  mode: "buffered" | "stream";
  resultAvailable: boolean;
  error: unknown | null;
};
```

Fields such as billed duration, cold start, token usage, or business audit metadata should be treated as optional extensions rather than guaranteed base fields.

## 16. Performance expectations

Streaming output can produce high-frequency updates. The child Shell should therefore batch or coalesce updates before notifying the framework layer.

The coalescing policy must preserve:

- chunk order
- terminal completion visibility
- error visibility

The optimization must not change the semantic order of the underlying stream.

## 17. Compatibility and evolution

The public bindable contract should evolve conservatively.

- Adding a new property is a compatibility decision.
- Renaming or removing public properties, inputs, or commands is a breaking change.
- Changing whether a field lives on the parent or child is a breaking change.
- Switching streaming transport internals is not a breaking change if the public contract remains stable.

## 18. Non-goals

The package is not intended to be:

- a generic job orchestration framework
- a Step Functions state viewer
- a browser-side Lambda credential holder
- a direct substitute for arbitrary event-driven workflow systems

## 19. Implementation guidance

The implementation should begin with buffered mode on the parent tag, then add the streaming child once the parent contract is stable.

Recommended order:

1. implement `LambdaCore` and the parent `<lambda-invoke>` contract
2. fix the security model for `functionName` and `qualifier`
3. define the normalized error contract
4. add the `<lambda-stream>` projection shell
5. add optional streaming transport optimizations without changing the public contract

This ordering keeps the authority boundary stable before adding transport-specific optimizations.