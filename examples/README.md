# @csbc-dev/lambda examples

These examples show the browser-facing `<lambda-invoke>` and `<lambda-stream>` components from four UI styles:

- `vanilla/` - plain DOM APIs
- `react/` - React refs around the custom element
- `vue/` - Vue render functions with lazy custom-element initialization
- `wcstack-state/` - declarative `@wcstack/state` path and command bindings

The examples import the package from `../../dist/index.js`, so build the package first:

```bash
npm run build
```

Then serve the repository root with any static server:

```bash
npx http-server . -c-1
```

Open one of these URLs:

```text
http://localhost:8080/examples/
http://localhost:8080/examples/vanilla/
http://localhost:8080/examples/react/
http://localhost:8080/examples/vue/
http://localhost:8080/examples/wcstack-state/
```

Each example defaults to a browser-only mock Lambda provider. Toggle remote mode and set the endpoint to use a real server-owned Core, for example `/api/lambda`. The examples intentionally accept only same-origin remote endpoints so demo payloads are not accidentally posted to an external origin.

The remote endpoint must keep AWS credentials server-side and should be created with `createLambdaRemoteHandler()` from `@csbc-dev/lambda/server`.