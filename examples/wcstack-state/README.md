# @wcstack/state example

Static HTML page that uses `data-wcs` declarative bindings and command tokens to drive `<lambda-invoke>`.

This example has no bundler. It reads the local `../../dist/index.js` build and uses the shared mock provider by default.

## Setup

Build the workspace package first so `dist/` exists:

```bash
npm install
npm run build
```

For mock mode, serve the repository root, or any static server setup that also exposes `/dist/`. For remote mode, start [`../server`](../server/) and open:

```text
http://localhost:3000/wcstack-state/
```

The example server also serves `/dist/` and `../shared` assets so the page can keep `/api/lambda` same-origin while reading the current workspace build.
