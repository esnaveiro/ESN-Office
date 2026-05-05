# ESN Office

An office management tool for ESN sections. Volunteers can check in and out, view who's currently in the office, manage inventory, and reserve the space — all in one place.

Built with Next.js 15, Supabase (database only), and ESN OAuth (accounts.esn.org).

---

## Features

- **Presence tracking** — check in/out manually or via GPS proximity; auto-checkout at 5 AM
- **Live office view** — see who's in the office and their current status (available, break, do not disturb, remote)
- **Office reservations** — book the space with optional board approval flow and email notifications
- **Inventory management** — track office supplies with change history and low-stock alerts
- **Analytics** — personal attendance stats, streaks, and office buddy insights
- **Admin panel** — manage volunteers, reservations, inventory, and app settings

---

## Getting started

See [SETUP.md](./SETUP.md) for the full deployment guide (Supabase, ESN OAuth, Vercel, cron job).

See [CONFIGURATION.md](./CONFIGURATION.md) for all environment variables and in-app settings.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | ESN OAuth 2.0 with PKCE |
| Styling | Tailwind CSS + shadcn/ui |
| Maps | Leaflet / react-leaflet |
| Email | Resend |
| Deployment | Vercel |
