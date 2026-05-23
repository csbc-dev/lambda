# Vanilla example

Vite client that drives `<lambda-invoke>` with plain DOM APIs.

## Setup

Build the workspace package once before installing this example, because it depends on the local `file:../..` package:

```bash
cd ../..
npm install
npm run build
cd examples/vanilla
```

```bash
npm install
npm run dev                # http://localhost:5173
```

This example is remote-first, so start [`../server`](../server/) first — Vite proxies `/api/lambda` to `http://localhost:3000`, where the server-owned Core runs. The endpoint is attached via the `remote-url` attribute (no AWS credentials in the browser).
