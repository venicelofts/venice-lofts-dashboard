# Azure configuration

Microsoft Entra ID (Azure) is used for dashboard sign-in and for local Graph mail scanning.

| Part               | Purpose                                         | Required now?                                       |
| ------------------ | ----------------------------------------------- | --------------------------------------------------- |
| **Part 1 — Auth**  | “Sign in with Microsoft” on the dashboard       | **Yes**                                             |
| **Part 2 — Graph** | Local `pnpm scan` mail read; future server sync | **Yes for email scan**; cron/org sync not built yet |

---

## Part 1 — Dashboard login (required)

Employees and admins sign in with Microsoft via **Supabase Auth**. This does **not** by itself grant the app access to mailboxes (that needs Application `Mail.Read` in Part 2).

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

## Part 2 — Graph mail (local scan today)

Local `pnpm scan` reads mail via **Microsoft Graph** with **application permissions** (client credentials). IMAP / app passwords are not used.

You can add these permissions to the **same** app registration as Part 1, or a dedicated sync app.

| Permission       | Type        | Purpose                         |
| ---------------- | ----------- | ------------------------------- |
| `Mail.Read`      | Application | Read org mailboxes for scanning |
| `Calendars.Read` | Application | Future calendar sync            |

### Setup

1. Use the same or a **dedicated** app registration
2. Add **Application** permissions above → **Grant admin consent**
3. Ensure a client secret exists (Part 1 secret is fine if reusing the same app)
4. Put in `.env.local`:

   ```env
   AZURE_TENANT_ID=<directory-tenant-id>
   AZURE_CLIENT_ID=<application-client-id>
   AZURE_CLIENT_SECRET=<client-secret-value>
   GRAPH_MAILBOX=you@yourdomain.com
   SCAN_LOOKBACK_HOURS=48
   ```

5. Optionally restrict mailboxes with an [Exchange Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access)

See [first-scan.md](first-scan.md) to run the scanner.

### Still planned (not implemented)

- `SYNC_CRON_SECRET` — secures a scheduled sync HTTP endpoint
- Admin UI to list mailbox UPNs in Settings
- `organizations` / `organization_members` tables for multi-user ops
- Server-side cron replacing local `pnpm scan`

---

## How Azure relates to local scanning

| Mechanism                          | Used for                                     |
| ---------------------------------- | -------------------------------------------- |
| Azure app + Supabase Auth provider | Dashboard login (delegated)                  |
| `AZURE_*` + `GRAPH_MAILBOX`        | **Today’s** email scan on your Mac via Graph |
| `SCAN_FOLDERS`                     | Optional PDF scan (no Graph needed)          |

---

## Quick checklist

**Today (sign-in)**

- [ ] App registration with Supabase callback redirect URI
- [ ] Client secret created
- [ ] Delegated permissions + admin consent
- [ ] Supabase Azure provider enabled
- [ ] `http://localhost:3000/auth/callback` in Supabase redirect URLs
- [ ] Sign-in works at localhost

**Email scan (Graph)**

- [ ] Application `Mail.Read` (+ optional `Calendars.Read`) + admin consent
- [ ] `AZURE_*`, `GRAPH_MAILBOX`, and `SCAN_LOOKBACK_HOURS` in `.env.local`
- [ ] Optional: Exchange Application Access Policy limited to that mailbox
- [ ] `pnpm scan` succeeds

**Later (server sync)**

- [ ] `SYNC_CRON_SECRET` in server env
- [ ] Cron hitting secured sync route
