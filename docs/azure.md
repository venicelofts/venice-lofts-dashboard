# Azure configuration

Microsoft Entra ID (Azure) is used in two ways in this project. **Only Part 1 is required today.**

| Part               | Purpose                                         | Required now?            |
| ------------------ | ----------------------------------------------- | ------------------------ |
| **Part 1 — Auth**  | “Sign in with Microsoft” on the dashboard       | **Yes**                  |
| **Part 2 — Graph** | Server-side mail/calendar sync (future Ops MVP) | No (not implemented yet) |

---

## Part 1 — Dashboard login (required)

Employees and admins sign in with Microsoft via **Supabase Auth**. This does **not** grant the app access to mailboxes.

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

## Part 2 — Graph mail/calendar sync (future)

> **Not built yet.** The app does not read mail via Graph today. Local scanning uses IMAP — see [first-scan.md](first-scan.md).

When server-side sync ships, an admin will configure **application permissions** (not delegated user OAuth):

| Permission       | Type        | Purpose            |
| ---------------- | ----------- | ------------------ |
| `Mail.Read`      | Application | Read org mailboxes |
| `Calendars.Read` | Application | Read calendars     |

Steps (for later):

1. Use the same or a **dedicated** app registration (recommended: separate sync app)
2. Add **Application** permissions above → **Grant admin consent**
3. Create a client secret
4. Put in `.env.local`:

   ```env
   AZURE_TENANT_ID=<directory-tenant-id>
   AZURE_CLIENT_ID=<application-client-id>
   AZURE_CLIENT_SECRET=<client-secret-value>
   ```

5. Optionally restrict mailboxes with an [Exchange Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access)

Also planned (not implemented):

- `SYNC_CRON_SECRET` — secures a scheduled sync HTTP endpoint
- Admin UI to list mailbox UPNs in Settings
- `organizations` / `organization_members` tables for multi-user ops

You can add the Graph env vars now; they are ignored until sync code lands.

---

## How Azure relates to local scanning

| Mechanism                          | Used for                           |
| ---------------------------------- | ---------------------------------- |
| Azure app + Supabase Auth provider | Dashboard login                    |
| `AZURE_*` in `.env.local`          | Future Graph sync only             |
| `IMAP_*` in `.env.local`           | **Today’s** email scan on your Mac |

IMAP mailbox credentials are separate from the Azure app used for sign-in. See [first-scan.md](first-scan.md).

---

## Quick checklist

**Today (sign-in)**

- [ ] App registration with Supabase callback redirect URI
- [ ] Client secret created
- [ ] Delegated permissions + admin consent
- [ ] Supabase Azure provider enabled
- [ ] `http://localhost:3000/auth/callback` in Supabase redirect URLs
- [ ] Sign-in works at localhost

**Later (Graph sync)**

- [ ] Application `Mail.Read` + `Calendars.Read` + admin consent
- [ ] `AZURE_*` and `SYNC_CRON_SECRET` in server env
- [ ] Cron hitting secured sync route
