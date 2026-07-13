# Configuration checklist

Step-by-step setup for Venice Lofts after the repo is cloned and dependencies are installed.

## 1. Database (one-time)

- [ ] Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/qdsltkyziufnwvtsvahc/sql/new)
- [ ] Paste and run [`supabase/migrations/20260711143000_itinerary_schema.sql`](supabase/migrations/20260711143000_itinerary_schema.sql)
- [ ] **Or** add `DATABASE_URL` to `.env.local` (Supabase → Project Settings → Database → Connection string URI) and run:

  ```bash
  pnpm db:migrate
  ```

## 2. Supabase Auth

- [ ] In Supabase, go to **Authentication** → **URL Configuration**
- [ ] Add redirect URL: `http://localhost:3000/auth/callback`
- [ ] Enable the **Email** provider (magic link)
- [ ] Optional: disable email confirmation for faster local testing

## 3. `.env.local` (project root)

These should already be set for this project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Still fill in:

- [ ] `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- [ ] `SCAN_FOLDERS` — comma-separated absolute paths, e.g.  
      `/Users/you/Downloads,/Users/you/Documents/trips`
- [ ] `SCAN_USER_ID` — leave blank until step 4

Optional email scan:

- [ ] `IMAP_HOST` — e.g. `imap.gmail.com`
- [ ] `IMAP_USER` — your email address
- [ ] `IMAP_PASS` — Gmail App Password (not your normal password)
- [ ] `IMAP_PORT=993` (default)
- [ ] `IMAP_LOOKBACK_HOURS=48` (how far back to scan)

See [`.env.example`](.env.example) for the full template.

## 4. Get your user id

- [ ] Start the app:

  ```bash
  cd ~/Developer/venice-lofts
  pnpm dev
  ```

- [ ] Open [http://localhost:3000](http://localhost:3000) and sign in via magic link
- [ ] Go to **Settings** in the app nav (not Supabase Dashboard)
- [ ] Copy the UUID shown under **Your user id**
- [ ] Paste it into `.env.local` as `SCAN_USER_ID=...`

## 5. First scan

- [ ] Put a travel/booking PDF in a watched folder, or have a matching email in your inbox
- [ ] Run:

  ```bash
  pnpm scan
  ```

- [ ] Check the terminal output for errors
- [ ] Refresh the dashboard — **Today** and **Sources** should populate

## 6. Morning automation (optional)

- [ ] Install the launchd job:

  ```bash
  ./scripts/install-launchd.sh
  ```

- [ ] Confirm logs at `~/Library/Logs/venice-lofts-scan.log`
- [ ] Note: your Mac must be awake around 7:00 for the scheduled scan to run

## 7. Security (recommended)

- [ ] Rotate the service role key in Supabase (if it was ever shared outside your machine)
- [ ] Update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- [ ] Never commit `.env.local` or put the service role key in any `NEXT_PUBLIC_*` variable

---

## Quick test order

1. Apply schema
2. Add auth redirect URL
3. `pnpm dev` → login
4. Copy user id from **Settings**
5. Set `ANTHROPIC_API_KEY` + `SCAN_FOLDERS`
6. `pnpm scan`
7. Check the dashboard
