# Azure configuration

Microsoft Entra ID (Azure) is used for dashboard sign-in and for Graph mail + calendar scanning.

| Part               | Purpose                                      | Required now?                   |
| ------------------ | -------------------------------------------- | ------------------------------- |
| **Part 1 — Auth**  | “Sign in with Microsoft” on the dashboard    | **Yes**                         |
| **Part 2 — Graph** | Local `pnpm scan` + secured `/api/sync` cron | **Yes for email/calendar scan** |

---

## Part 1 — Dashboard login (required)

Employees and admins sign in with Microsoft via **Supabase Auth**. This does **not** by itself grant the app access to mailboxes (that needs Application permissions in Part 2).

### 1. App registration

1. Open [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** → **App registrations**
2. Create a new registration (or use an existing one), e.g. `Venice Lofts Dashboard`
3. Supported account types: **Accounts in this organizational directory only** (single tenant) unless you need broader access
4. Redirect URI — platform **Web**:

   ```
   https://qdsltkyziufnwvtsvahc.supabase.co/auth/v1/callback
   ```

   Replace the project ref if you use a different Supabase project.

### 2. Client secret

1. In the app → **Certificates & secrets** → **New client secret**
2. Copy the **Value** immediately (shown once)

### 3. API permissions (delegated)

Under **API permissions** → **Microsoft Graph** → **Delegated**:

- `email`
- `openid`
- `profile`
- `User.Read`

Click **Grant admin consent** for the tenant if sign-in fails with errors about email or permissions.

### 4. Supabase Auth provider

1. Supabase Dashboard → **Authentication** → **Providers** → **Azure**
2. Enable Azure
3. Paste:
   - **Client ID** — Application (client) ID from Azure
   - **Client Secret** — from step 2
   - **Tenant URL** or tenant ID — Directory (tenant) ID from Azure overview

### 5. Redirect URLs in Supabase

**Authentication** → **URL Configuration** → **Redirect URLs**, add:

```
http://localhost:3000/auth/callback
```

Add your production URL when deployed, e.g. `https://your-app.vercel.app/auth/callback`.

### 6. Test sign-in

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → **Sign in with Microsoft**.

### Troubleshooting sign-in

| Symptom                                           | Fix                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Redirect URI mismatch                             | Azure redirect must exactly match `https://<project-ref>.supabase.co/auth/v1/callback` |
| “Error getting user email from external provider” | Grant admin consent; ensure `email` delegated permission is present                    |
| Callback error on localhost                       | Add `http://localhost:3000/auth/callback` in Supabase URL config                       |
| Wrong tenant                                      | Confirm tenant ID in Supabase Azure provider matches the app registration’s directory  |

---

## Part 2 — Graph mail + calendar

Local `pnpm scan` and the server `/api/sync` cron read mail and calendar via **Microsoft Graph** with **application permissions** (client credentials). IMAP / app passwords are not used.

You can add these permissions to the **same** app registration as Part 1, or a dedicated sync app.

| Permission       | Type        | Purpose                         |
| ---------------- | ----------- | ------------------------------- |
| `Mail.Read`      | Application | Read org mailboxes for scanning |
| `Calendars.Read` | Application | Read Outlook calendar for sync  |

### Grant Calendars.Read (and Mail.Read if missing)

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → your Venice Lofts Graph app
2. **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Add **`Calendars.Read`** (and **`Mail.Read`** if not already present)
4. Click **Grant admin consent for [your tenant]**
5. Confirm both Application permissions show a green **Granted** status:
   - `Mail.Read`
   - `Calendars.Read`
6. Ensure a client secret exists (**Certificates & secrets**)
7. Put in `.env.local` (and Vercel production env for cron):

   ```env
   AZURE_TENANT_ID=<directory-tenant-id>
   AZURE_CLIENT_ID=<application-client-id>
   AZURE_CLIENT_SECRET=<client-secret-value>
   GRAPH_MAILBOX=you@yourdomain.com
   SCAN_LOOKBACK_HOURS=48
   SCAN_CALENDAR_FORWARD_DAYS=90
   ```

8. Optionally restrict mailboxes with an [Exchange Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access) — calendar uses the same mailbox UPN as mail

**Verify (optional):** after consent, `GET /users/{GRAPH_MAILBOX}/calendarView?startDateTime=...&endDateTime=...` should return 200.

See [first-scan.md](first-scan.md) to run the local scanner.

### Scheduled server sync (`/api/sync`)

1. Generate a secret: `openssl rand -hex 32`
2. Set `SYNC_CRON_SECRET` in Vercel (and `.env.local` for local testing)
3. Also set on the server: `AZURE_*`, `GRAPH_MAILBOX`, `SCAN_USER_ID`, Supabase keys, `ANTHROPIC_API_KEY` (mail extraction)
4. Vercel Cron (see `vercel.json`) hits `/api/sync` daily. Set **`CRON_SECRET`** to the same value as `SYNC_CRON_SECRET` so Vercel’s automatic `Authorization: Bearer` header is accepted, or call manually with:

   ```
   Authorization: Bearer <SYNC_CRON_SECRET>
   ```

5. Manual test:

   ```bash
   curl -X POST https://your-app.vercel.app/api/sync \
     -H "Authorization: Bearer $SYNC_CRON_SECRET"
   ```

The cron runs Graph **mail + calendar** only (not local PDF folders).

---

## How Azure relates to scanning

| Mechanism                          | Used for                                          |
| ---------------------------------- | ------------------------------------------------- |
| Azure app + Supabase Auth provider | Dashboard login (delegated)                       |
| `AZURE_*` + `GRAPH_MAILBOX`        | Email + calendar scan (local CLI and `/api/sync`) |
| `SCAN_FOLDERS`                     | Optional PDF scan on Mac only (no Graph needed)   |
| `SYNC_CRON_SECRET`                 | Authorizes `POST /api/sync`                       |

---

## Quick checklist

**Today (sign-in)**

- [ ] App registration with Supabase callback redirect URI
- [ ] Client secret created
- [ ] Delegated permissions + admin consent
- [ ] Supabase Azure provider enabled
- [ ] `http://localhost:3000/auth/callback` in Supabase redirect URLs
- [ ] Sign-in works at localhost

**Email + calendar scan (Graph)**

- [ ] Application `Mail.Read` + `Calendars.Read` + admin consent
- [ ] `AZURE_*`, `GRAPH_MAILBOX`, `SCAN_LOOKBACK_HOURS`, `SCAN_CALENDAR_FORWARD_DAYS` in `.env.local`
- [ ] Optional: Exchange Application Access Policy limited to that mailbox
- [ ] `pnpm scan` succeeds; Calendar tab shows Outlook events

**Server sync**

- [ ] `SYNC_CRON_SECRET` + Graph/scan env on Vercel
- [ ] Cron hitting `POST /api/sync` with Bearer secret
