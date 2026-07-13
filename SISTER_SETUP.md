# Setup on another Mac (e.g. your sister)

Use this guide when installing Venice Lofts on **someone else’s computer**. Each person needs:

1. **The dashboard** — view schedule in the browser
2. **The local scanner** — reads their email/PDFs and uploads extracted events to Supabase

The morning job runs **on their Mac**, not yours.

---

## Shared vs separate Supabase

### Option A — Same Supabase project (recommended for family)

- One Supabase project for everyone
- Each person signs in with **their own email**
- Row-level security keeps each person’s data separate
- You share the same project URL and API keys (service role stays local only)

### Option B — Her own Supabase project

- Fully isolated data
- She creates a project, runs the migration SQL, and uses her own keys in `.env.local`
- Follow [SETUP.md](SETUP.md) for schema and auth steps on her project

The steps below assume **Option A** (shared project).

---

## Prerequisites (her Mac)

- [ ] macOS
- [ ] Node.js 22+ and pnpm
- [ ] Git

Install Node (if needed):

```bash
# Example with nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
corepack enable
```

---

## 1. Get the code

```bash
git clone <your-repo-url> ~/Developer/venice-lofts
cd ~/Developer/venice-lofts
pnpm install
```

---

## 2. Configure `.env.local`

Copy the template:

```bash
cp .env.example .env.local
```

Fill in these values:

| Variable                               | What to use                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Same project URL you use                                                                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same publishable key                                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Same as publishable key                                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`            | Same service role key — **only on her Mac, never in the browser**                                          |
| `ANTHROPIC_API_KEY`                    | Her key, or a shared family key                                                                            |
| `SCAN_FOLDERS`                         | **Her** folders (comma-separated absolute paths), e.g. `/Users/jane/Downloads,/Users/jane/Documents/trips` |
| `SCAN_USER_ID`                         | Leave empty until step 4                                                                                   |
| `IMAP_HOST`                            | Optional — e.g. `imap.gmail.com`                                                                           |
| `IMAP_USER`                            | Her email                                                                                                  |
| `IMAP_PASS`                            | Gmail **App Password** (not normal password)                                                               |
| `IMAP_PORT`                            | `993`                                                                                                      |
| `IMAP_LOOKBACK_HOURS`                  | `48` (default)                                                                                             |

---

## 3. Supabase Auth (one-time, in dashboard)

If using the **same** project as you, this may already be done. Otherwise:

- [ ] Supabase → **Authentication** → **URL Configuration**
- [ ] Add redirect URL: `http://localhost:3000/auth/callback`
- [ ] Enable **Email** (magic link)

---

## 4. First login → get her user id

```bash
pnpm dev
```

- [ ] Open [http://localhost:3000](http://localhost:3000)
- [ ] She signs in with **her** email (magic link)
- [ ] Go to **Settings** in the app (top nav — not Supabase Dashboard)
- [ ] Copy **Your user id** (UUID)
- [ ] Add to `.env.local`: `SCAN_USER_ID=<her-uuid>`
- [ ] Stop and restart `pnpm dev` if it was already running (optional; scan only needs the env var)

---

## 5. Test the scanner

- [ ] Put a travel/booking PDF in one of her watched folders, **or** have a matching email in her inbox
- [ ] Run:

```bash
pnpm scan
```

- [ ] Check terminal output for errors
- [ ] Refresh the dashboard → **Today** and **Sources** should show new items

---

## 6. Morning automation (her Mac)

At **7:00 AM** local time, macOS `launchd` can run `pnpm scan` automatically.

### Fix paths first (important)

The plist in `launchd/com.venicelofts.scan.plist` may still point at **your** username and paths. On her Mac, edit it **before** installing:

1. **Project path** — e.g. `/Users/jane/Developer/venice-lofts`
2. **pnpm path** — on her Mac run `which pnpm` and use that full path in `ProgramArguments`

Example command inside the plist:

```xml
<string>cd /Users/jane/Developer/venice-lofts &amp;&amp; /path/from/which/pnpm scan</string>
```

### Install the job

```bash
chmod +x scripts/install-launchd.sh
./scripts/install-launchd.sh
```

### Logs

- `~/Library/Logs/venice-lofts-scan.log`
- `~/Library/Logs/venice-lofts-scan.err.log`

### Notes

- Her Mac must be **awake** around 7:00 — asleep Macs skip that day’s run
- She can always run manually: `pnpm scan`
- The web app does **not** run the scan; only her Mac does

---

## 7. Gmail IMAP (if she uses Gmail)

- [ ] Turn on 2-Step Verification in Google Account
- [ ] Create an **App Password** (Google Account → Security → App passwords)
- [ ] In `.env.local`:

```env
IMAP_HOST=imap.gmail.com
IMAP_USER=her@gmail.com
IMAP_PASS=xxxx xxxx xxxx xxxx
IMAP_PORT=993
```

---

## What runs where

| Piece                     | Location                                 |
| ------------------------- | ---------------------------------------- |
| Morning `launchd` job     | **Her Mac**                              |
| Reading email / PDF files | **Her Mac**                              |
| Claude API calls          | From her Mac                             |
| Stored events / trips     | Supabase (cloud)                         |
| Dashboard UI              | Browser (`pnpm dev` or hosted URL later) |

Your computer does **not** need to run her scans.

---

## Checklist for you (before handoff)

- [ ] Repo pushed to GitHub (or zip sent)
- [ ] She has Supabase URL + publishable + service role keys (or her own project)
- [ ] She has an Anthropic API key
- [ ] `launchd` plist paths updated for **her** username and `which pnpm`
- [ ] Walkthrough: login → Settings → `SCAN_USER_ID`
- [ ] Her `SCAN_FOLDERS` and optional IMAP configured
- [ ] One successful `pnpm scan` together
- [ ] `./scripts/install-launchd.sh` on her Mac

---

## Quick order

1. Clone repo → `pnpm install`
2. `.env.local` (except `SCAN_USER_ID`)
3. `pnpm dev` → she logs in → copy user id → set `SCAN_USER_ID`
4. `pnpm scan` → verify dashboard
5. Fix plist paths → `./scripts/install-launchd.sh`

For your own machine, see [SETUP.md](SETUP.md).
