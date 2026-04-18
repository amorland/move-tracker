# Starland Move Tracker

A personal relocation hub for the Starland family — Andrew, Tory, Remy, Harper, and Winston — moving from Clearwater, FL to Cold Spring, NY in summer 2026.

## Features

- **Overview** — Command center with key dates, countdown to drive start, task progress, and belongings resolution at a glance
- **Tasks** — Full to-do list organized by category; assignable to Andrew, Tory, or Both; tracks completion date; completed tasks stay visible with strikethrough
- **Belongings** — Item-by-item tracker for deciding what to Bring, Sell, Donate, or Trash; items stay visible when resolved
- **Timeline** — Chronological view of all key dates, custom events (with time + confirmed/estimated), and tasks with due dates; grouped by month
- **Move Map** — Interactive driving route with distance, estimated drive time, and arrival date based on the Drive Start anchor date
- **Password-protected** — Simple cookie-based auth; single shared app password

## Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (Postgres)
- **Styling**: Tailwind CSS v4 + custom design system
- **Map**: Leaflet + react-leaflet, routing via OSRM, geocoding via Nominatim
- **Auth**: Cookie-based password gate (httpOnly, 30-day session)
- **Deploy**: Vercel

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (accessible on local network)
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
APP_PASSWORD=your_app_password
```

## Database Setup

Run the SQL in `supabase-schema.sql` against your Supabase project to create the initial tables and seed data.

If migrating from an earlier version of this app, run `supabase-migration.sql` first — it handles:
- Removing deprecated task fields (`timingType`, `timingOffsetDays`, etc.)
- Renaming `packing_items` → `belongings` and normalizing status values
- Creating the new `events` table for custom timeline entries

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         # Login / logout
│   │   ├── belongings/   # Belongings CRUD
│   │   ├── categories/   # Task categories + tasks (combined GET)
│   │   ├── events/       # Custom timeline events CRUD
│   │   ├── locations/    # Map locations CRUD
│   │   ├── settings/     # Anchor dates (key dates)
│   │   └── tasks/        # Tasks CRUD
│   ├── belongings/       # Belongings page
│   ├── login/            # Login page
│   ├── map/              # Move Map page
│   ├── tasks/            # Tasks page
│   ├── timeline/         # Timeline page
│   ├── layout.tsx        # App shell (header, sidebar, bottom nav)
│   └── page.tsx          # Overview / dashboard
├── components/
│   └── MoveMap.tsx       # Leaflet map component
└── lib/
    ├── dateUtils.ts      # Milestone helpers + date validation
    ├── supabase.ts       # Supabase client
    └── types.ts          # Shared TypeScript types
```

## Deployment

The app is deployed on Vercel. Push to `main` to trigger a deployment. Make sure all three environment variables are set in the Vercel project settings.
