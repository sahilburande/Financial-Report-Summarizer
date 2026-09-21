# FinBrief AI — Financial Report Summarizer

FinBrief is a standalone React + Express + tRPC application for turning financial reports into concise briefs.

## Standalone deployment

This version no longer requires Manus OAuth, Manus Forge storage, or Manus runtime plugins at runtime.

### Local development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open the URL printed by the server, normally `http://localhost:3000`.

### AI summaries

Set `OPENAI_API_KEY` in `.env` to enable real AI-generated summaries. Without a key, the app still runs and returns a safe built-in fallback summary.

### Render

Use:

- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm build`
- Start command: `pnpm start`
- Plan: Free

No personal domain is required. Render provides an `onrender.com` URL.

The default deployment uses in-memory storage, so reports are lost when the free service restarts. Set up a persistent database later if you need durable report history.
