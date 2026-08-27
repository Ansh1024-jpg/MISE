# MISE — Culinary Decision Engine

React + Vite frontend, Express backend. The Gemini key never reaches the browser:
the client posts to `/api/gemini` and the server calls Gemini with the key held
in its own environment.

## Run locally

```bash
npm install
cp .env.example .env      # then paste your key into GEMINI_API_KEY
npm run dev               # http://localhost:3000
```

Get a key at https://aistudio.google.com/apikey (the key works against the public
Gemini API — you do not need AI Studio itself to run this).

## Build and run production locally

```bash
npm run build
GEMINI_API_KEY=... npm start
```

`npm run build` produces:
- `dist/client/` — static frontend
- `dist/server.cjs` — bundled Express server (serves `dist/client` and `/api/gemini`)

## Deploy to Render (recommended)

1. Push this folder to a GitHub repo.
2. Render → **New → Web Service** → connect the repo.
3. Render reads `render.yaml`, or set manually:
   - Runtime: **Node**
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/healthz`
4. Add environment variable `GEMINI_API_KEY` (mark it secret).
5. Deploy.

Free-tier instances sleep after ~15 minutes idle and take ~30–60s to wake.

## Deploy anywhere else

A `Dockerfile` is included, so the same image runs on Railway, Fly.io, Koyeb,
Google Cloud Run, or any container host. Set `GEMINI_API_KEY` in that host's
secrets. Nothing else is required — the server reads `PORT` from the environment.

**Not suitable without rework:** Vercel/Netlify/Cloudflare Pages. They run
serverless functions, not a long-lived Express process, so `server.ts` would have
to be restructured and the SSE streaming endpoint reworked.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | — | Server-side Gemini auth. Process exits if unset. |
| `PORT` | no | 3000 | Injected by most hosts. |
| `GEMINI_MODEL` | no | `gemini-3.6-flash` | Swap models without a code change. |
| `RATE_LIMIT_PER_HOUR` | no | 60 | Per-IP cap on `/api/gemini`. |
