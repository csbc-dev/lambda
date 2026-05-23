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

Start [`../server`](../server/) first when you want remote mode. Vite proxies `/api/lambda` to `http://localhost:3000`.
