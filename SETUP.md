# ESN Office — Deployment Guide

A step-by-step guide for ESN sections deploying their own instance of this app.

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier is sufficient)
- A [Vercel](https://vercel.com) account (free tier is sufficient)
- A [Resend](https://resend.com) account for transactional email (free tier: 3 000 emails/month)
- **Auth provider** — choose one:
  - **ESN OAuth** (recommended for ESN sections): requires an OAuth client registered with your national IT Manager
  - **Supabase Auth** (email/password): no external registration required; set `NEXT_PUBLIC_AUTH_PROVIDER=supabase`

See [CONFIGURATION.md — Choosing an auth provider](./CONFIGURATION.md#choosing-an-auth-provider) for a full comparison.

---

## 1. Fork the repository

Fork this repository to your section's GitHub organisation (or your personal account).

---

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, region closest to your section, and a strong database password
3. Wait for the project to finish provisioning (~1 min)
4. Go to **Project Settings → API** and note:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

---

## 3. Run the database migrations

Open the Supabase **SQL Editor** and run the following files in order. Each file is idempotent — safe to re-run if something goes wrong.

| Order | File | What it does |
|-------|------|--------------|
| 1 | `migrations/schema_baseline.sql` | Creates all tables (volunteers, schedules, presence_logs, scheduled_checkins, settings, inventory, office_reservations, board_settings), indexes, RLS policies, triggers, and the `get_current_reservation` function |
| 2 | `migrations/add_esn_auth.sql` | No-op on a fresh DB (columns already in baseline); idempotent upgrade path for existing DBs |
| 3 | `migrations/auto_checkout_5am.sql` | Creates the `auto_checkout_5am` scheduled job (runs nightly at 05:00 UTC) |
| 4 | `migrations/fix_security_warnings.sql` | Enables RLS on `board_settings`; recreates `inventory_with_latest_change` view with `security_invoker` |

Paste the contents of each file into the SQL Editor and click **Run**.

---

## 4. Register an ESN OAuth client

Contact your national IT Manager to register an OAuth client for your section. You will need to provide:

- **Application name**: e.g. `ESN Aveiro Office App`
- **Platform**: React (Web)
- **Redirect URI**: `https://<your-vercel-domain>/auth/callback` (this is derived from `NEXT_PUBLIC_APP_URL` — no separate env var needed)
- **Scope**: `oauth2_access_to_profile_information`

You will receive a **Client ID** and **Client Secret**.

---

## 5. Set up Resend

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your section's sending domain (e.g. `esnaveiro.org`)
3. Go to **API Keys → Create API Key** → `RESEND_API_KEY`
4. Your `EMAIL_FROM` will be something like `ESN Aveiro <noreply@esnaveiro.org>`

> If you don't have a custom domain yet, Resend provides a shared `onboarding@resend.dev` address for testing. Replace it before going to production.

---

## 6. Generate a session secret

Run the following command to generate a secure random secret:

```bash
openssl rand -hex 32
```

This becomes your `SESSION_SECRET`.

---

## 7. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your fork
2. Vercel will auto-detect Next.js — leave the build settings as-is
3. Before clicking **Deploy**, open **Environment Variables** and add all variables from the table below (see [CONFIGURATION.md](./CONFIGURATION.md) for the full reference)

At minimum you need:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ESN_CLIENT_ID
ESN_CLIENT_SECRET
SESSION_SECRET
NEXT_PUBLIC_APP_URL
ADMIN_EMAILS
NEXT_PUBLIC_SECTION_NAME
NEXT_PUBLIC_OFFICE_ADDRESS
NEXT_PUBLIC_OFFICE_LATITUDE
NEXT_PUBLIC_OFFICE_LONGITUDE
RESEND_API_KEY
EMAIL_FROM
```

4. Click **Deploy**
5. Once deployed, copy the production URL (e.g. `https://esn-aveiro-office.vercel.app`) and:
   - Set `NEXT_PUBLIC_APP_URL` to that URL
   - Set `ESN_REDIRECT_URI` to `https://esn-aveiro-office.vercel.app/auth/callback`
   - Redeploy for the changes to take effect

---

## 8. Set up the auto-checkout cron job

The auto-checkout migration (`auto_checkout_5am.sql`) creates a Supabase scheduled job, but you can also trigger it externally for reliability.

**Option A — Vercel Cron (recommended)**

Add a `vercel.json` at the repo root:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-checkout",
      "schedule": "0 5 * * *"
    }
  ]
}
```

Generate a random secret for `CRON_SECRET` (`openssl rand -hex 32`) and add it to your Vercel environment variables. The cron job sends `Authorization: Bearer <CRON_SECRET>` with each request.

**Option B — External cron service**

Use any HTTP cron service (e.g. cron-job.org) to POST to:

```
POST https://<your-domain>/api/cron/auto-checkout
Authorization: Bearer <CRON_SECRET>
```

Schedule it daily at 05:00 UTC (or adjust to your timezone).

---

## 9. First login and admin setup

1. Open your deployed app and click **Sign in with ESN Accounts**
2. The first user whose email matches `ADMIN_EMAILS` will automatically receive admin privileges on login
3. Once logged in as admin, go to `/admin` → **Settings** to:
   - Add board member emails (for reservation approval notifications)
   - Adjust office hours, reservation rules, and geolocation radius

---

## Finding your office coordinates

You need the exact GPS coordinates of your office for check-in proximity validation.

1. Open [Google Maps](https://maps.google.com) and navigate to your office entrance
2. Right-click on the exact point → the coordinates appear at the top of the context menu
3. Copy **latitude** → `NEXT_PUBLIC_OFFICE_LATITUDE`
4. Copy **longitude** → `NEXT_PUBLIC_OFFICE_LONGITUDE`

The default check-in radius is **12 metres**. This can be adjusted in the admin settings.

---

## Local development

```bash
# 1. Clone your fork
git clone https://github.com/<your-org>/esn-office.git
cd esn-office

# 2. Install dependencies
npm install

# 3. Copy the example env file and fill in your values
cp .env.example .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For local OAuth to work, your ESN OAuth client's redirect URI must include `http://localhost:3000/auth/callback`. You can register a separate dev client or ask your national IT Manager to add the localhost URI to your existing client.
