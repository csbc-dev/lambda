# Vue example

Vite + Vue client that uses `@wc-bindable/vue`'s `useWcBindable` composable around `<lambda-invoke>`.

## Setup

Build the workspace package once before installing this example, because it depends on the local `file:../..` package:

```bash
cd ../..
npm install
npm run build
cd examples/vue
```

```bash
npm install
npm run dev                # http://localhost:5175
```

This example is remote-first, so start [`../server`](../server/) first — Vite proxies `/api/lambda` to `http://localhost:3000`, where the server-owned Core runs. The endpoint is attached via the `remote-url` attribute (no AWS credentials in the browser).
