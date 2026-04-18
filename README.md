# Starland Move Tracker

A private web app for Andrew and Tory's move from Clearwater, FL to Cold Spring, NY in summer 2026. Tracks tasks, belongings, key dates, and the move route.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Postgres) for storage
- **Tailwind CSS v4** with a custom design system
- **Vitest** for tests
- **Deployed on Vercel**

## Design System — "Twilight"

Deep indigo-navy header/sidebar (`#1e1b4b`) over a lavender-tinted cream content area (`#f5f4f8`). Primary actions use soft indigo (`#6366f1`/`#4f46e5`); gold (`#f0b432`) reserved for the star logo and key date moments; sage green (`#7a9e87`) used for success/completion states. Lora serif for headings, DM Sans for body. Borders carry a subtle indigo tint.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Overview** | `/` | Mini timeline of all 7 key move dates, task completion stats, and belonging summary |
| **The List** | `/tasks` | To-do list grouped by category; filter chips by owner; click-to-cycle owner tag per row; single collapsible completed section |
| **The Big Sort** | `/belongings` | Items grouped by room; action badges (Bring / Sell / Donate / Trash); 3-state segmented filter; action-specific resolution labels (Resolved / Sold / Donated / Trashed) |
| **The Journey** | `/timeline` | Chronological timeline with search, type filter chips (with icons), gold star key dates, Confirmed/Estimated chips, editable events |
| **The Route** | `/map` | Leaflet map with route polyline; multi-day ETA; editable departure time; overnight stop encoding |

## Key Date Rules

Seven milestones in order: U-Pack Dropoff (FL) → Pickup (FL) → Drive Start → Arrival (NY) → House Closing → U-Pack Delivery (NY) → Final Pickup (NY). When dates are confirmed the API enforces ordering constraints (e.g. pickup must be exactly 3 days after dropoff, arrival must precede closing).

## Move Map — Multi-Day ETA

Drive time uses a 0.8× correction factor on OSRM duration. Overnight stops are encoded as a `[overnight]` prefix in the location notes field. The ETA splits adjusted drive time across `overnightStops + 1` days of driving, each starting at the configured departure time (default 09:00).

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
│   ├── belongings/       # The Big Sort page
│   ├── login/            # Login page
│   ├── map/              # The Route page
│   ├── tasks/            # The List page
│   ├── timeline/         # The Journey page
│   ├── globals.css       # Design system (Twilight theme)
│   ├── layout.tsx        # App shell (indigo header, sidebar, mobile bottom nav)
│   └── page.tsx          # Overview / dashboard
├── components/
│   └── MoveMap.tsx       # Leaflet map component (client-only)
├── __tests__/            # Vitest test suite
└── lib/
    ├── dateUtils.ts      # Milestone helpers + date validation
    ├── supabase.ts       # Supabase client
    ├── types.ts          # Shared TypeScript types
    └── useScrollLock.ts  # JS scroll lock hook for modals
```
