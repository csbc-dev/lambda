# Lambda example server

Shared local server for the Lambda examples. It exposes a mock remote Core at `/api/lambda` so the browser examples can exercise remote mode without AWS credentials.

Requires Node 20.6+ because the scripts use `node --env-file=...`.

Before starting this server, build the workspace package once so `/dist/` exists:

```bash
npm install
npm run build
```

## Setup

```bash
npm install
npm run dev                # http://localhost:3000/api/lambda
```

`.env` is optional. `server.js` already provides defaults for `PORT` and `ALLOWED_ORIGINS`, so copy `.env.example` only when you need to override them.

Vite clients proxy `/api/lambda` to this server. The static `wcstack-state` page can also be opened from this server at `http://localhost:3000/wcstack-state/` when you want same-origin remote mode.

The server also exposes `/dist/` so the static `wcstack-state` page reads the current workspace build instead of a published CDN version.
