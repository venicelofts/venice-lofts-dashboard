# First scan

Run the **local CLI scanner** on your Mac. It reads email (Microsoft Graph) and/or PDF folders, sends text to Claude, and writes events into Supabase as a **shared ops dataset** (every signed-in user sees the same data).

**Prerequisites:** [Initial setup](initial-setup.md) and [Azure sign-in](azure.md) (so you can open Settings and get a user id for `SCAN_USER_ID`). For email scanning you also need Application `Mail.Read` + admin consent — see [azure.md](azure.md) Part 2.

---

## How it works

```
pnpm scan  →  Graph mailbox / PDF folders  →  Claude extraction  →  Supabase (events, sources)
```

Scanning runs on **your machine**, not in the browser. The hosted UI cannot trigger it (`/api/scan` returns 501 by design).

---

## 1. Confirm the database

If you skipped this in initial setup, run the SQL in [`supabase/migrations/`](../supabase/migrations/) in the Supabase SQL Editor (or `pnpm db:migrate` with `DATABASE_URL` set). Fresh projects need both:

- `20260711143000_itinerary_schema.sql`
- `20260727223000_shared_ops_rls.sql` (shared access for all signed-in users)

---

## 2. Set `SCAN_USER_ID`

Pick **one** admin account as the scan owner (any signed-in user works; data is shared).

1. `pnpm dev` → open [Settings](http://localhost:3000/settings)
2. Copy **Your user id** (UUID)
3. In `.env.local`:

   ```env
   SCAN_USER_ID=paste-your-uuid-here
   ```

Scans write rows under this id. Every authenticated user can view and edit the shared dataset.

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

### Option A — Email (Microsoft Graph)

Scans **INBOX** for the lookback window (default 48 hours). Only travel/schedule-related messages are processed.

Requires Application permission `Mail.Read` + admin consent on the Entra app (same app as dashboard login is fine). See [azure.md](azure.md) Part 2.

```env
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
GRAPH_MAILBOX=you@yourdomain.com
SCAN_LOOKBACK_HOURS=48
```

- `GRAPH_MAILBOX` is the mailbox UPN Graph will read (e.g. `shelby@theloftsvenicebeach.com`)
- Prefer an Exchange Application Access Policy so the app can only access that mailbox
- No app passwords or IMAP

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
Scanning mailbox via Microsoft Graph…
Email scan: { messagesSeen, messagesProcessed, eventsCreated, ... }
Scanning Outlook calendar via Microsoft Graph…
Calendar scan: { eventsSeen, eventsUpserted, eventsRemoved, ... }
Scan complete.
```

### Common errors

| Error                                   | Fix                                                          |
| --------------------------------------- | ------------------------------------------------------------ |
| `SCAN_USER_ID is required`              | Set from Settings (step 2)                                   |
| `ANTHROPIC_API_KEY is not set`          | Add key (step 3)                                             |
| `Failed to create scan_runs row`        | Run database migration                                       |
| `Missing ... SUPABASE_SERVICE_ROLE_KEY` | Check Supabase vars in `.env.local`                          |
| Graph token / mail request failed       | Check `AZURE_*`, `Mail.Read` + admin consent, mailbox        |
| Graph calendar request failed           | Check `Calendars.Read` + admin consent on the same Entra app |
| `eventsCreated: 0`                      | Normal if no matching mail/PDFs in the lookback window       |

Graph failures print on separate lines with the failing step and the API error text when available.

---

## 6. View results

With `pnpm dev` running:

| Page                                       | What to check                                      |
| ------------------------------------------ | -------------------------------------------------- |
| [Today](http://localhost:3000/)            | Events; “On the calendar”; “Last synced” timestamp |
| [Calendar](http://localhost:3000/calendar) | Month grid of Outlook-synced events                |
| [Review](http://localhost:3000/review)     | Low-confidence items to confirm                    |
| [Sources](http://localhost:3000/sources)   | Ingested emails and files                          |
| [Settings](http://localhost:3000/settings) | Scan run history (ok / error)                      |
| [Trips](http://localhost:3000/trips)       | Trip groupings when extracted                      |

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
- [ ] Graph mail/calendar (`AZURE_*` + `GRAPH_MAILBOX`) **or** `SCAN_FOLDERS` configured
- [ ] Application `Mail.Read` + `Calendars.Read` + admin consent (if using Graph)
- [ ] `pnpm scan` → `Scan complete.`
- [ ] Today / Calendar / Sources show data

---

## Server sync (production)

Set `SYNC_CRON_SECRET` on Vercel and allow cron to `POST /api/sync` with
`Authorization: Bearer <secret>`. See [azure.md](azure.md) Part 2.
