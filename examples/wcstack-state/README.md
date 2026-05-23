# @wcstack/state example

Static HTML page that uses `data-wcs` declarative bindings and command tokens to drive `<lambda-invoke>`.

This example has no bundler. It imports `@csbc-dev/lambda` from a CDN and uses the shared mock provider by default.

## Setup

For mock mode, serve the repository examples with any static server. For remote mode, start [`../server`](../server/) and open:

```text
http://localhost:3000/wcstack-state/
```

The server also serves `../shared` assets so the page can keep `/api/lambda` same-origin.
