# Velgora — Single-tenant Lead Pipeline CRM

A clean, production-shaped lead pipeline CRM: capture demand, auto-qualify
leads with a 0–100 score (hot / warm / cold), and move them through a
pipeline (New → Qualified → Proposal → Won / Lost) with a built-in activity
timeline and notification inbox.

Built with **Vite + React 18 + TypeScript + Tailwind CSS + Supabase**.

## Features
- **Overview dashboard** — total leads, qualified count, hot opportunities, win rate.
- **Pipeline board** — drag-free kanban by stage with lead scoring and priority.
- **Lead intake** — capture form with automatic qualification scoring.
- **Lead detail** — follow-up email drafting, notes, stage changes, activity history.
- **Notifications** — in-app inbox for new leads, stage changes, and follow-ups.
- **No login, single-tenant** — shared workspace backed by Supabase.

## Local development
```bash
npm install
cp .env.example .env        # then fill in your Supabase values
npm run dev                 # http://localhost:5173
```
Requires a Supabase project. Create one, then run the SQL in
`supabase/migrations/20260811054239_create_lead_pipeline.sql` in the Supabase
SQL editor to create the `leads`, `lead_activities`, and `notifications` tables.

## Deploy to Vercel
1. Push this repo to GitHub.
2. In Vercel, **Import** the repository (Vite preset is auto-detected).
3. Add the two environment variables from `.env.example`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. `vercel.json` already sets the build command, output dir (`dist`),
   and an SPA fallback rewrite.

## Security note
This is a no-login, single-tenant demo: the Supabase tables use Row Level
Security with `anon` + `authenticated` granted full access so the shared
workspace works without auth. **Before any real use**, lock this down —
add authentication and tighten the RLS policies in the migration SQL, and
remove open `INSERT`/`UPDATE`/`DELETE` for anonymous clients.
