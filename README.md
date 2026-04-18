# Starland Move Tracker

A private web app for Andrew and Tory's move from Clearwater, FL to Cold Spring, NY in summer 2026. Tracks tasks, belongings, key dates, and move locations.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Postgres) for storage
- **Tailwind CSS v4** with a custom design system (sage green accent, warm cream background, Lora serif headings, DM Sans body)
- **Vitest** for tests
- **Deployed on Vercel**

## Pages

| Page | Description |
|------|-------------|
| **Overview** | Mini timeline of all 7 key move dates at a glance, plus task and belonging summaries |
| **Tasks** | To-do list grouped by category, filterable by owner (Andrew / Tory / Both) and phase (Move Out / Move In / Both), with a labeled "Mark done" pill per row |
| **Belongings** | Item inventory with action badges (Bring / Sell / Donate / Trash), filter chips, and a "Resolve" pill per row |
| **Timeline** | Move events with confirmed/estimated date toggling; validation rules enforce correct ordering between key dates |
| **Move Map** | Leaflet map of key locations (origin, destination, stops, services) with a sidebar list |

## Key Date Rules

The app tracks 7 milestones in order: U-Pack Dropoff (FL) → Pickup (FL) → Drive Start → Arrival (NY) → House Closing → U-Pack Delivery (NY) → Final Pickup (NY). When dates are confirmed, the API enforces ordering constraints (e.g. pickup must be exactly 3 days after dropoff, arrival must precede closing, delivery must follow closing).

## Running Locally

Requires a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
APP_PASSWORD=...
```

```bash
npm install
npm run dev     # starts on 0.0.0.0:3000
```

## Tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

Tests cover `dateUtils` validation logic and all API route handlers (belongings, tasks, events, settings) using mocked Supabase.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         # Login / logout
│   │   ├── belongings/   # Belongings CRUD
│   │   ├── categories/   # Task categories + tasks (combined GET)
│   │   ├── events/       # Timeline events CRUD
│   │   ├── locations/    # Map locations CRUD
│   │   ├── settings/     # Key dates (move settings)
│   │   └── tasks/        # Tasks CRUD
│   ├── belongings/       # Belongings page
│   ├── login/            # Login page
│   ├── map/              # Move Map page
│   ├── tasks/            # Tasks page
│   ├── timeline/         # Timeline page
│   ├── layout.tsx        # App shell (header, sidebar, mobile bottom nav)
│   └── page.tsx          # Overview / dashboard
├── __tests__/            # Vitest test suite
└── lib/
    ├── dateUtils.ts      # Milestone helpers + date validation
    ├── supabase.ts       # Supabase client
    ├── types.ts          # Shared TypeScript types
    └── useScrollLock.ts  # JS scroll lock hook for modals
```
