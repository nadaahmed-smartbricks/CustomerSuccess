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

## Roadmap

- **v0 (this)** — schema + the three tables, add-person, log-a-touch (with feedback &
  per-segment questions), person history, dashboard, outreach log.
- **v1** — codify each segment (F1–P5) as a PostHog query and auto-generate the weekly
  "who to contact" queue.
- **v2** — Weekly Review dashboard (NPS trend, feature-request leaderboard, theme rollups),
  incentive-spend tracking, and simple shared-login auth.
