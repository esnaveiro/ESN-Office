# ESN Office — Configuration Reference

All configuration is done through environment variables. Set them in Vercel's project settings (or in `.env.local` for local development).

---

## Environment variables

### Supabase (database)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL — found in **Project Settings → API** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key — used in the browser for read queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — used server-side only, bypasses RLS. **Never expose this to the client.** |

### ESN OAuth

| Variable | Required | Description |
|----------|----------|-------------|
| `ESN_CLIENT_ID` | Yes | OAuth client ID issued by your national IT Manager |
| `ESN_CLIENT_SECRET` | Yes | OAuth client secret. Keep this private. |

### Session

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | 32-byte hex string used to sign session JWTs. Generate with `openssl rand -hex 32`. Rotating this invalidates all active sessions. |

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_AUTH_PROVIDER` | No | `esn` | `esn` — ESN OAuth via accounts.esn.org. `supabase` — email/password via Supabase Auth. See [Choosing an auth provider](#choosing-an-auth-provider) below. |
| `NEXT_PUBLIC_APP_URL` | Yes | — | The public URL of your deployment, e.g. `https://esn-aveiro-office.vercel.app`. Used to construct the OAuth redirect URI (`<APP_URL>/auth/callback`) — this is what you register with your national IT Manager. No trailing slash. |
| `ADMIN_EMAILS` | Yes | Comma-separated list of ESN account emails that receive admin privileges on first login, e.g. `president@esnaveiro.org,tech@esnaveiro.org` |

### Section identity

These are baked into the client bundle at build time (`NEXT_PUBLIC_*`). A redeploy is required after changing them.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SECTION_NAME` | Yes | `ESN` | Your section's display name, e.g. `ESN Aveiro`. Shown in the login page, map popup, and office layout header. |
| `NEXT_PUBLIC_OFFICE_ADDRESS` | Yes | `ESN Office` | Human-readable address shown in the map popup and timeline. e.g. `Rua Dr. Roberto Frias, Porto` |
| `NEXT_PUBLIC_OFFICE_LATITUDE` | Yes | `0` | Latitude of your office entrance (decimal degrees). Used for GPS check-in proximity. |
| `NEXT_PUBLIC_OFFICE_LONGITUDE` | Yes | `0` | Longitude of your office entrance (decimal degrees). Used for GPS check-in proximity. |

### Email (Resend)

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | API key from your Resend account |
| `EMAIL_FROM` | Yes | The sender shown to recipients. Format: `Display Name <address@yourdomain.org>`, e.g. `ESN Aveiro <noreply@esnaveiro.org>` |

### Cron

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes | Bearer token that protects the `/api/cron/auto-checkout` endpoint. Generate with `openssl rand -hex 32`. |

---

## In-app admin settings

These are stored in the database (`board_settings` table) and can be changed at runtime from the **Admin → Settings** panel without a redeploy.

### Board emails

List of email addresses that receive reservation approval requests. Managed in **Admin → Settings → Board Emails**.

These are independent of `ADMIN_EMAILS` — board members receive email notifications but do not necessarily have admin access to the app.

### Office hours

Opening and closing times per day of the week. Used to validate reservation requests (no bookings outside office hours).

| Field | Default |
|-------|---------|
| Monday–Friday | 09:00–18:00 (enabled) |
| Saturday | 10:00–14:00 (disabled) |
| Sunday | 10:00–14:00 (disabled) |

### Reservation rules

| Setting | Default | Description |
|---------|---------|-------------|
| Max reservations per user per month | 10 | Prevents a single user from monopolising the space |
| Advance booking limit | 30 days | How far in the future a reservation can be made |
| Minimum duration | 30 min | Shortest allowed reservation |
| Maximum duration | 8 hours | Longest allowed reservation |

### Check-in settings

| Setting | Default | Description |
|---------|---------|-------------|
| Geolocation radius | 100 m | Radius used when prompting users to check in based on proximity |
| Auto-checkout hour | 5 (05:00 UTC) | Hour at which all volunteers are automatically checked out |

> The GPS **check-in proximity threshold** (12 m) is a code-level constant in `src/lib/constants.ts` (`OFFICE_PROXIMITY_METERS`) and is not currently exposed in the admin UI. Edit it directly if your office layout requires a different radius.

### Inventory

| Setting | Default |
|---------|---------|
| Low stock threshold | 5 units |
| Default categories | Office Supplies, Electronics, Furniture, Miscellaneous |

---

## Choosing an auth provider

| | ESN OAuth (`esn`) | Supabase Auth (`supabase`) |
|-|-------------------|---------------------------|
| **Who manages passwords** | ESN centrally (accounts.esn.org) | Your Supabase project |
| **Requires national IT Manager registration** | Yes | No |
| **Login UI** | Single SSO button | Email + password form |
| **Signup** | Automatic on first ESN login | Self-service signup page |
| **`SESSION_SECRET` needed** | Yes (custom JWT) | No (Supabase JWT) |
| **`ESN_CLIENT_ID/SECRET` needed** | Yes | No |

Set `NEXT_PUBLIC_AUTH_PROVIDER=supabase` if you cannot register an ESN OAuth client or are running an instance outside the ESN network.

> **Note:** `SESSION_SECRET` is only used by ESN auth. With `supabase` provider you can omit it.

---

## Example `.env.local`

### ESN OAuth

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
NEXT_PUBLIC_AUTH_PROVIDER=esn
ESN_CLIENT_ID=PT-PORT-ESN--xxxxxxxxxxxx
ESN_CLIENT_SECRET=xxxxxxxxxxxx
SESSION_SECRET=a3f2...64 hex chars...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=you@esnaveiro.org

# Section identity
NEXT_PUBLIC_SECTION_NAME=ESN Aveiro
NEXT_PUBLIC_OFFICE_ADDRESS=Rua Dr. Roberto Frias, Porto
NEXT_PUBLIC_OFFICE_LATITUDE=41.178554
NEXT_PUBLIC_OFFICE_LONGITUDE=-8.598039

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=ESN Aveiro <noreply@esnaveiro.org>

# Cron
CRON_SECRET=b9e1...64 hex chars...
```

### Supabase Auth (email/password)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
NEXT_PUBLIC_AUTH_PROVIDER=supabase

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=you@example.org

# Section identity
NEXT_PUBLIC_SECTION_NAME=My ESN Section
NEXT_PUBLIC_OFFICE_ADDRESS=Your office address
NEXT_PUBLIC_OFFICE_LATITUDE=0.000000
NEXT_PUBLIC_OFFICE_LONGITUDE=0.000000

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=My Section <noreply@example.org>

# Cron
CRON_SECRET=b9e1...64 hex chars...
```
