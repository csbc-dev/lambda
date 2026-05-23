# React example

Vite + React client that drives `<lambda-invoke>` through `@wc-bindable/react`'s `useWcBindable` hook.

## Setup

Build the workspace package once before installing this example, because it depends on the local `file:../..` package:

```bash
cd ../..
npm install
npm run build
cd examples/react
```

```bash
npm install
npm run dev                # http://localhost:5174
```

Start [`../server`](../server/) first when you want remote mode. Vite proxies `/api/lambda` to `http://localhost:3000`.
