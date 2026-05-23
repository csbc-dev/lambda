# ADR 0001: Stream transport baseline for `lambda-stream`

## Status

Accepted

## Context

`@csbc-dev/lambda` exposes an authority-bearing parent tag, `<lambda-invoke>`, and an optional projection child tag, `<lambda-stream>`.

The package supports two result modes:

- buffered mode exposed by the parent alone
- stream mode exposed by the parent plus child projection

For stream mode, the Core may eventually support multiple transport strategies:

1. **server-proxied stream**
   The privileged runtime receives the Lambda stream and forwards chunk events to the browser-facing invocation surface.
2. **presigned direct stream**
   The privileged runtime authorizes and signs an endpoint, then the browser reads the stream directly without relaying bytes through the control channel.

Both strategies are compatible with the public parent-child component model, but they optimize different concerns.

The design constraints that matter here are:

- security of the invocation boundary is the top priority
- the public bindable contract must stay stable across transport changes
- parent authority and child projection must remain intact
- initial implementation complexity should stay low enough to get the package shipped
- transport choice must not leak into the child tag contract

## Decision

The package will adopt **server-proxied stream** as the initial baseline transport for `<lambda-stream>`.

`presigned direct stream` remains an allowed future optimization, but it is **not** the baseline design and it must not shape the initial public contract.

This means:

1. the first implementation of stream mode assumes that the privileged runtime remains in the data path
2. `<lambda-stream>` models streaming state only and does not declare or imply a specific transport
3. the Core chooses the transport strategy; the Shells do not
4. any later direct-stream optimization must preserve the same bindable parent-child surface

## Rationale

### 1. It preserves the generic Lambda scope

Server-proxied streaming works for a broader set of Lambda invocation environments.

By contrast, a direct browser stream tends to push the package toward a narrower Function URL-oriented product shape. That is a valid optimization path, but it changes the effective scope from generic Lambda invocation toward a subset of Lambda deployment patterns.

The baseline should stay generic.

### 2. It keeps security and policy centralised in the Core

The current package priorities put boundary security ahead of transport efficiency.

Starting with a proxied stream keeps:

- function pinning
- qualifier pinning
- invocation authorization
- error normalization
- audit and post-invoke behavior

in the same privileged execution path as buffered invocation.

This reduces the number of moving parts in the first shipping design.

### 3. It keeps the public contract independent from transport

The parent-child component contract should survive transport changes.

If the first design were built around presigned direct reads, there would be pressure to let the transport shape the public API. That would make later changes more expensive.

Starting with the server-proxied stream keeps the public contract centered on state, not network topology.

### 4. It lowers first-implementation risk

The repository is still early-stage. The shortest path to a usable package is:

- buffered invoke on the parent
- streaming projection on the child
- one transport path that works end to end

Server-proxied streaming is the most direct way to achieve that without simultaneously solving endpoint signing, browser-direct stream attachment, and the edge cases around direct-path observability.

## Alternatives considered

### Alternative A: make presigned direct stream the default baseline

Pros:

- closest symmetry with the S3 design where the heavy data path avoids the control channel
- potentially lower server bandwidth for large streaming responses
- strong long-term story for LLM-like chunked output

Cons:

- narrows the effective product shape toward functions that can safely expose a directly consumable signed endpoint
- increases implementation and observability complexity in the first release
- makes it easier for transport concerns to leak into the public contract
- complicates the story for generic Lambda invocation environments

Decision:

Rejected as the initial baseline. Kept as a future optimization.

### Alternative B: expose separate top-level tags per transport or invocation mode

Examples:

- `<lambda-invoke>` for buffered RPC
- `<lambda-stream>` as an independent authority-bearing stream tag
- `<lambda-async>` for fire-and-forget

Pros:

- makes each path look operationally explicit

Cons:

- duplicates authority boundaries and shared policy rules
- leaks backend invocation taxonomy into the public component model
- makes security and compatibility rules drift across top-level tags

Decision:

Rejected. The package standardizes on parent authority plus child projection.

## Consequences

### Positive

- the first implementation path is simpler
- the package stays aligned with generic Lambda invocation
- security and pin policy remain easy to reason about
- child transport abstraction stays clean

### Negative

- the initial stream path may relay bytes through the privileged runtime
- server resource usage may be higher than a direct-stream design
- a future optimization pass is still needed if bandwidth efficiency becomes a leading quality concern

## Follow-up rules

Any later introduction of a presigned direct-stream path must satisfy all of the following:

1. `<lambda-invoke>` remains the sole authority-bearing tag
2. `<lambda-stream>` remains a projection shell only
3. the bindable contract of parent and child stays compatible
4. pinning and authorization policy remain Core-owned
5. post-invoke and audit behavior remain well-defined even when the privileged runtime no longer sees every streamed byte

## Implementation note

The recommended implementation order stays:

1. buffered invocation on `<lambda-invoke>`
2. proxied stream projection on `<lambda-stream>`
3. optional direct-stream optimization behind the same contract