# Itinerary Dashboard

Local-scan + Supabase dashboard for turning emails and PDFs into schedules and itineraries.

## Stack

- Next.js (App Router) dashboard with Supabase Auth + Realtime
- Local `pnpm scan` agent (folders + IMAP → Claude → Supabase)
- macOS `launchd` morning job at 7:00

## Setup

- **[SETUP.md](SETUP.md)** — configure on your machine
- **[SISTER_SETUP.md](SISTER_SETUP.md)** — install on another Mac (e.g. family member)

See **SETUP.md** for a full configuration checklist.

1. **Apply the schema** (one-time)

   Either paste [`supabase/migrations/20260711143000_itinerary_schema.sql`](supabase/migrations/20260711143000_itinerary_schema.sql) into the [SQL Editor](https://supabase.com/dashboard/project/qdsltkyziufnwvtsvahc/sql/new), **or** set `DATABASE_URL` in `.env.local` and run:

   ```bash
   pnpm db:migrate
   ```

2. **Env**

   Copy `.env.example` → `.env.local` (already seeded for this project). Set:
   - `ANTHROPIC_API_KEY`
   - `SCAN_FOLDERS` — comma-separated absolute paths
   - Optional IMAP: `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`
   - `SCAN_USER_ID` — after first login, copy from **Settings**

3. **Auth**

   In Supabase Auth settings, add redirect URL:

   `http://localhost:3000/auth/callback`

4. **Run dashboard**

   ```bash
   pnpm dev
   ```

5. **Run scanner**

   ```bash
   pnpm scan
   ```

6. **Morning automation**

   ```bash
   cp launchd/com.itinerary.scan.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.itinerary.scan.plist
   ```

## Privacy

Raw emails/PDFs stay on the Mac. Extracted structured events and short excerpts are stored in Supabase. Text sent to Claude for extraction leaves the device. The service role key is for the local agent only — never expose it to the browser.
