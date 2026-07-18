# First scan

Run the **local CLI scanner** on your Mac. It reads email (IMAP) and/or PDF folders, sends text to Claude, and writes events into Supabase for your user.

**Prerequisites:** [Initial setup](initial-setup.md) and [Azure sign-in](azure.md) (so you can open Settings and get your user id).

---

## How it works

```
pnpm scan  →  read IMAP inbox / PDF folders  →  Claude extraction  →  Supabase (events, sources)
```

Scanning runs on **your machine**, not in the browser. The hosted UI cannot trigger it (`/api/scan` returns 501 by design).

---

## 1. Confirm the database

If you skipped this in initial setup, run [`supabase/migrations/20260711143000_itinerary_schema.sql`](../supabase/migrations/20260711143000_itinerary_schema.sql) in the Supabase SQL Editor (or `pnpm db:migrate` with `DATABASE_URL` set).

---

## 2. Set `SCAN_USER_ID`

1. `pnpm dev` → open [Settings](http://localhost:3000/settings)
2. Copy **Your user id** (UUID)
3. In `.env.local`:

   ```env
   SCAN_USER_ID=paste-your-uuid-here
   ```

---

## 3. Set `ANTHROPIC_API_KEY`

Claude extracts schedule items from email/PDF text.

```env
ANTHROPIC_API_KEY=sk-ant-...
```

From [console.anthropic.com](https://console.anthropic.com).

---

## 4. Choose scan sources

Configure **at least one** of email or PDF folders.

### Option A — Email (IMAP)

Scans **INBOX** for the last 48 hours (default). Only travel/schedule-related messages are processed.

```env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_USER=you@yourdomain.com
IMAP_PASS=your-app-password
IMAP_LOOKBACK_HOURS=48
```

- Work/school Microsoft 365: `outlook.office365.com`
- Many tenants require an **app password** or have IMAP disabled
- This is **not** the Azure app used for dashboard sign-in

### Option B — Local PDF folders

Comma-separated **absolute** paths on your Mac:

```env
SCAN_FOLDERS=/Users/you/Documents/Travel,/Users/you/Downloads
```

Only PDFs matching travel/schedule keywords (in text or filename) are sent to Claude.

---

## 5. Run the scan

```bash
cd ~/Developer/venice-lofts
pnpm scan
```

**Success looks like:**

```
Scanning folders: ...
Folder scan: { filesSeen, filesProcessed, eventsCreated, ... }
Scanning IMAP inbox…
Email scan: { messagesSeen, messagesProcessed, eventsCreated, ... }
Scan complete.
```

### Common errors

| Error                                   | Fix                                                    |
| --------------------------------------- | ------------------------------------------------------ |
| `SCAN_USER_ID is required`              | Set from Settings (step 2)                             |
| `ANTHROPIC_API_KEY is not set`          | Add key (step 3)                                       |
| `Failed to create scan_runs row`        | Run database migration                                 |
| `Missing ... SUPABASE_SERVICE_ROLE_KEY` | Check Supabase vars in `.env.local`                    |
| IMAP auth / connection errors           | Verify credentials; try PDF folders instead            |
| `eventsCreated: 0`                      | Normal if no matching mail/PDFs in the lookback window |

IMAP failures now print on separate lines with the failing step (`connect`, `SEARCH`, etc.) and the server’s response text when available. For verbose protocol logs, add `IMAP_DEBUG=1` to `.env.local`.

---

## 6. View results

With `pnpm dev` running:

| Page                                       | What to check                   |
| ------------------------------------------ | ------------------------------- |
| [Today](http://localhost:3000/)            | Events; “Last scan” timestamp   |
| [Review](http://localhost:3000/review)     | Low-confidence items to confirm |
| [Sources](http://localhost:3000/sources)   | Ingested emails and files       |
| [Settings](http://localhost:3000/settings) | Scan run history (ok / error)   |
| [Trips](http://localhost:3000/trips)       | Trip groupings when extracted   |

Today uses Supabase Realtime — events may appear without a full page refresh.

---

## 7. Optional — daily scan at 7:00 AM

```bash
./scripts/install-launchd.sh
```

Logs: `~/Library/Logs/venice-lofts-scan.log` and `venice-lofts-scan.err.log`

Edit [`launchd/com.venicelofts.scan.plist`](../launchd/com.venicelofts.scan.plist) if your repo or Node path differs.

---

## Checklist

- [ ] Migration applied
- [ ] `SCAN_USER_ID` from Settings
- [ ] `ANTHROPIC_API_KEY` set
- [ ] IMAP **or** `SCAN_FOLDERS` configured
- [ ] `pnpm scan` → `Scan complete.`
- [ ] Today / Sources show data

---

## Not used for scanning

These `.env.local` vars are for **future** server Graph sync, not `pnpm scan`:

- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- `SYNC_CRON_SECRET`

See [azure.md](azure.md) Part 2.
