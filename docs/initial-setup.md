# Initial setup

Get the app running locally after cloning the repo.

**Next steps after this guide:** [Azure configuration](azure.md) → [First scan](first-scan.md)

---

## Prerequisites

- macOS (scanner and optional daily job are Mac-oriented)
- [Node.js 22+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (project uses `pnpm@10`)
- Access to the shared Supabase project

---

## 1. Clone and install

```bash
git clone <your-repo-url> ~/Developer/venice-lofts
cd ~/Developer/venice-lofts
pnpm install
```

---

## 2. Environment file

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the **Supabase** section:

| Variable                               | Where to find it                                         |
| -------------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Project Settings → API → Project URL          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page → publishable / anon key                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | Same page → service role key (server-only; never commit) |

See [`.env.example`](../.env.example) for the full template including scanner and future Graph vars.

---

## 3. Database (one-time)

The app uses the **itinerary** schema migration (not org/ops tables yet).

**Option A — Supabase SQL Editor (simplest)**

1. Open the [SQL Editor](https://supabase.com/dashboard/project/qdsltkyziufnwvtsvahc/sql/new)
2. Paste and run the full file: [`supabase/migrations/20260711143000_itinerary_schema.sql`](../supabase/migrations/20260711143000_itinerary_schema.sql)

**Option B — CLI from your machine**

1. Add `DATABASE_URL` to `.env.local` (Supabase → Project Settings → Database → connection string URI)
2. Run:

   ```bash
   pnpm db:migrate
   ```

**Confirm:** Table Editor should list `profiles`, `events`, `sources`, `documents`, `trips`, `scan_runs`.

---

## 4. Microsoft sign-in (Azure)

Before you can use the dashboard, configure Azure + Supabase Auth.

Follow **[Azure configuration](azure.md)** — at minimum complete **Part 1 (dashboard login)**.

---

## 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Microsoft.

If sign-in fails, see troubleshooting in [azure.md](azure.md).

---

## 6. Verify the dashboard

After sign-in you should see navigation for **Today**, **Trips**, **Review**, **Sources**, and **Settings**.

| Page     | Purpose                                           |
| -------- | ------------------------------------------------- |
| Today    | This week’s events                                |
| Review   | Low-confidence extractions                        |
| Sources  | Emails/PDFs ingested by the scanner               |
| Settings | Your user id (needed for scanning) + scan history |

---

## 7. What to do next

| Goal                               | Guide                                  |
| ---------------------------------- | -------------------------------------- |
| Ingest email/PDFs and see events   | [First scan](first-scan.md)            |
| Add a team member (dashboard only) | [Employee setup](employee-setup.md)    |
| Future Graph / org sync            | [Azure configuration](azure.md) Part 2 |

---

## Security

- Never commit `.env.local`
- Never put secrets in `NEXT_PUBLIC_*` variables
- `SUPABASE_SERVICE_ROLE_KEY` is only for server-side tools (`pnpm scan`, future sync jobs)
