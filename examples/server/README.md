# Lambda example server

Shared local server for the Lambda examples. It exposes a mock remote Core at `/api/lambda` so the browser examples can exercise remote mode without AWS credentials.

## Setup

```bash
cp .env.example .env
npm install
npm run dev                # http://localhost:3000/api/lambda
```

Vite clients proxy `/api/lambda` to this server. The static `wcstack-state` page can also be opened from this server at `http://localhost:3000/wcstack-state/` when you want same-origin remote mode.
