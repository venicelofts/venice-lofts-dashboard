# Venice Lofts

Org-scoped ops dashboard for Venice Lofts: Outlook mail and calendar → AI thread summaries and nested tasks → a prioritized daily workflow.

## What it does (MVP)

1. Connect Lofts Outlook inboxes read-only (Microsoft Graph; admin configures all mailboxes)
2. Deduplicate the same message across mailboxes by `internetMessageId` into one parent thread
3. Use Claude to summarize threads and create nested action items
4. Assign, prioritize, date, note, complete, close, and archive tasks (assignees = employee users only)
5. Ops home: Focus First, Needs Attention, Today/Week Ahead, Upcoming Events, Email Tasks, Pipeline, Done Today
6. Read Outlook calendar; create simple manual events with required loft space and overlap warnings
7. Keep a basic activity history

**Out of scope for MVP:** invoices, documents, WhatsApp, DocSend, departmental checklists, detailed Event pages, Ownership/Team views, employee self-serve mailbox OAuth, weather, automatic daily recap, and file/PDF scanning.

Legacy Trips / itinerary views may remain as secondary navigation until cleaned up.

## Stack

- Next.js (App Router) + Supabase Auth (Microsoft) + Postgres RLS
- Microsoft Graph (application permissions) for mail + calendar sync
- Claude (Anthropic) for thread summary and nested tasks
- Server-side scheduled sync (not a per-Mac local scanner)

## Setup

Documentation lives in **[docs/](docs/README.md)**:

1. **[Initial setup](docs/initial-setup.md)** — clone, database, `.env.local`, `pnpm dev`
2. **[Azure configuration](docs/azure.md)** — Microsoft sign-in; Graph sync (future)
3. **[First scan](docs/first-scan.md)** — run `pnpm scan` on your Mac

Also: **[Employee setup](docs/employee-setup.md)** — dashboard access without scanner secrets.

```bash
pnpm install
cp .env.example .env.local   # fill in secrets
pnpm db:migrate              # or run SQL in Supabase
pnpm dev
```

See **[docs/](docs/README.md)** for the full walkthrough.

## Privacy and security

- Mail and calendar are read via Graph with tenant admin consent; raw mailbox access stays in Microsoft 365.
- Structured threads, summaries, tasks, and events are stored in Supabase.
- Text sent to Claude for extraction leaves the server during AI processing.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, Graph client secrets, or `SYNC_CRON_SECRET` in `NEXT_PUBLIC_*` variables or the browser.
