# Smart Bricks — Customer Success Tracker

A lightweight internal tool for the **Product** team and **Justin (Sales)** to track
outreach to high-intent / value customers and capture the feedback that comes back — so
the weekly Product ⇄ Sales check-in has one shared source of truth instead of scattered notes.

It's built around the two working documents it came from:

- **Customer Segmentation — Marketing Brief** → the 13 segments (F1–F8, P1–P5), their
  definitions, lead objectives (Convert / Re-engage / Feedback), ★ high-value flags,
  incentive tiers, and per-segment feedback questions. All encoded in
  [`src/lib/segments.ts`](src/lib/segments.ts).
- **Draft Sales Call Guide** → the call tiers (Tier 1/2/3) attached to each logged call.

## The loop it supports

1. The weekly PostHog review surfaces who's worth a touch (leads, high-intent, dormant, etc.).
2. Those people are added to the tracker (manually today; auto-synced from PostHog in v1).
3. Justin / Product log each **touch** — channel (Call / In person / WhatsApp / Email),
   outcome, incentive offered, next action — and capture **feedback** (NPS, blocker,
   feature request, quote, roadmap tags, and the segment's own questions).
4. The dashboard rolls it up for the check-in: who needs a first touch, follow-ups due,
   recent activity, and feedback stats.

## Data model

Three linked tables ([`prisma/schema.prisma`](prisma/schema.prisma)):

- **Person** — name, email, tier, segment, lead objective, and the *activity signal* that flagged them.
- **Outreach** — one touchpoint: channel, owner, call tier, status, outcome, incentive, next action.
- **Feedback** — NPS, blocker, feature request, competitor tool, verbatim quote, theme tags,
  and answers to the segment's pre-loaded questions.

## Tech

Next.js 16 (App Router) · React 19 · Prisma 7 (Postgres, via the `@prisma/adapter-pg` driver
adapter) · Tailwind 4. Designed to deploy on Vercel with a hosted Postgres (Neon / Vercel Postgres).

## Local development

```bash
npm install                     # also runs `prisma generate`
cp .env.example .env            # then set DATABASE_URL (local Postgres)
npm run db:migrate              # apply the schema
npm run db:seed                 # optional: load sample people & touches
npm run dev                     # http://localhost:3000
```

Useful scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `POSTHOG_API_KEY` / `POSTHOG_PROJECT_ID` / `POSTHOG_HOST` | Server-side PostHog access for the segment sync (v1). |

## PostHog sync (v1)

The **Sync** tab pulls this week's outreach candidates straight from PostHog. Each of the 13
segments is a HogQL query ([`src/lib/segment-queries.ts`](src/lib/segment-queries.ts)) mapped to
real Smart Bricks events (`advisor_limit_hit`, `upgrade_cta_clicked`, `pro_feature_used`, …).
Matching people are upserted into the tracker and assigned their highest-priority segment;
logged outreach and notes are never overwritten. Internal `is_sb_internal_user` accounts are
excluded (set `SYNC_EXCLUDE_INTERNAL_DOMAIN=true` to also drop `@smart-bricks.com` emails).

To enable it, set **`POSTHOG_API_KEY`** (a personal API key with `query:read`) and
`POSTHOG_PROJECT_ID` in the environment (locally and in Vercel). Thresholds live in the query
file and are easy to tune without touching the sync engine.

## AI call feedback (v3)

On the **Log a touch** form, paste a call transcript and click **Extract with AI** — Claude
reads it and fills in the feedback fields (NPS, blocker, feature request, competitor tool,
a verbatim quote, roadmap theme tags, a suggested outcome, and answers to that segment's
questions) for Justin to review and edit before saving. The transcript and an AI summary are
stored on the outreach and shown on the person's history.

Extraction uses the Claude API ([`src/lib/extract.ts`](src/lib/extract.ts)) via a forced
tool call, so the result is structured and validated. Set **`ANTHROPIC_API_KEY`** to enable it
(optionally `ANTHROPIC_MODEL`, default `claude-opus-4-8`).

### Automatic transcript webhook

Instead of anyone pasting a transcript, point your calling tool's transcript webhook at:

```
POST /api/webhooks/transcript
```

Authenticate with the shared secret in **`TRANSCRIPT_WEBHOOK_SECRET`** — sent as an
`x-webhook-secret` header, a `Bearer` token, or a `?token=` query param. The endpoint accepts a
forgiving JSON payload ([`route.ts`](src/app/api/webhooks/transcript/route.ts)) — it maps common
field names (`transcript`/`text`, `email`, `phone`/`from`/`caller`, `name`, `agent`, `timestamp`, …):

```bash
curl -X POST "$APP_URL/api/webhooks/transcript" \
  -H "x-webhook-secret: $TRANSCRIPT_WEBHOOK_SECRET" \
  -H "content-type: application/json" \
  -d '{"email":"lead@example.com","phone":"+971501234567",
       "transcript":"Full call transcript…","provider":"twilio"}'
```

On receipt it ([`src/lib/ingest.ts`](src/lib/ingest.ts)):
1. Matches the caller to a tracked **Person** by email or phone (last-9-digit match).
2. If matched → creates a **Call** outreach (status Reached) and runs the AI extraction to fill
   the feedback + summary. Appears in the person's history and the Weekly Review automatically.
3. If not matched → stores it under **Calls → Unmatched** so nothing is lost; you can add the
   caller as a person (prefilled) and future calls match automatically.

Extraction runs after the webhook responds (via `after()`), so the provider never times out.
A provider-specific adapter (HMAC signature verification, exact field mapping) can be added per tool.

## Roadmap

- **v0** — schema + the three tables, add-person, log-a-touch (with feedback &
  per-segment questions), person history, dashboard, outreach log.
- **v1 (this)** — each segment (F1–P5) codified as a PostHog query; the Sync tab auto-builds
  the "who to contact" queue.
- **v2** — Weekly Review dashboard (NPS trend, feature-request leaderboard, theme rollups).
- **v3** — paste a call transcript, Claude extracts structured feedback into the form.
- **v3b (this)** — a transcript webhook auto-ingests calls: match to a person, extract feedback,
  create the touch; unmatched calls land in a review queue.
- **Next** — a provider adapter for the chosen dialer (HMAC verification); incentive-spend
  tracking; shared-login auth.
