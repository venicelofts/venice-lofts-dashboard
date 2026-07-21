# Employee setup

Give a Venice Lofts **employee** access to the dashboard without scanner or server secrets on their machine.

**Admin setup:** [Initial setup](initial-setup.md) · [Azure](azure.md) · [First scan](first-scan.md)

---

## What employees do

- Sign in with Microsoft and use the dashboard
- View and work assigned tasks/events (as the app supports today)
- **Do not** run `pnpm scan` or store Graph/service-role secrets locally

> **Note:** Org-wide membership (`organization_members`) and shared ops views are planned but not in the database yet. Today the app is largely **per-user** (data scoped by `user_id`).

---

## Option A — Hosted app (recommended)

1. Admin shares the production URL
2. Employee signs in with their Microsoft account
3. Use Today, Trips, Review, Sources, Settings

No `.env.local` required.

---

## Option B — Local dev (testing only)

### 1. Clone and install

```bash
git clone <your-repo-url> ~/Developer/venice-lofts
cd ~/Developer/venice-lofts
pnpm install
cp .env.example .env.local
```

### 2. Minimal `.env.local`

Only the public Supabase vars:

| Variable                               | Source         |
| -------------------------------------- | -------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Shared project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Shared project |

**Do not** put on employee laptops:

- `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_CLIENT_SECRET`
- `SYNC_CRON_SECRET`
- `SCAN_USER_ID`, `GRAPH_MAILBOX`, `SCAN_FOLDERS` (scanner vars)

### 3. Auth redirect

Supabase → **Authentication** → **URL Configuration** must include:

```
http://localhost:3000/auth/callback
```

(Same as [azure.md](azure.md) — usually configured once by admin.)

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in with Microsoft.

---

## What runs where

| Piece                         | Location                 |
| ----------------------------- | ------------------------ |
| Dashboard UI                  | Browser                  |
| Mail/PDF ingest (`pnpm scan`) | Admin Mac only           |
| Claude extraction             | During scan on admin Mac |
| Stored events                 | Supabase                 |

---

## Admin checklist before handoff

- [ ] Employee can sign in via Microsoft ([azure.md](azure.md))
- [ ] Share hosted URL (or minimal local env for dev)
- [ ] When org tables exist: add `organization_members` row with role `employee`
