# Starland Move Tracker

A private web app for Andrew and Tory's move from Clearwater, FL to Cold Spring, NY in summer 2026. Tracks tasks, belongings, key dates, and the move route.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Postgres) for storage
- **Tailwind CSS v4** with a custom design system (sage green accent, warm cream background, dark navy header/sidebar, Lora serif headings, DM Sans body)
- **Vitest** for tests
- **Deployed on Vercel**

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Overview** | `/` | Mini timeline of all 7 key move dates, task completion stats, and belonging summary |
| **The List** | `/tasks` | To-do list grouped by category with inline category dividers; filter chips by owner (Andrew / Tory); click-to-cycle owner tag per row; single collapsible completed section |
| **The Big Sort** | `/belongings` | Item inventory grouped by room; action badges (Bring / Sell / Donate / Trash); 3-state segmented filter (All / Active / Done); "Sort it" / "✓ Sorted" pill per row |
| **The Journey** | `/timeline` | Chronological move timeline with type filter chips (All / Key Dates / Events / Tasks); editable custom events; confirmed/estimated badges; Star icon for key dates |
| **The Route** | `/map` | Leaflet map with route polyline; multi-day ETA using 0.8× OSRM duration and overnight stop encoding; editable departure time in stats bar |

## Key Date Rules

Seven milestones in order: U-Pack Dropoff (FL) → Pickup (FL) → Drive Start → Arrival (NY) → House Closing → U-Pack Delivery (NY) → Final Pickup (NY). When dates are confirmed the API enforces ordering constraints (e.g. pickup must be exactly 3 days after dropoff, arrival must precede closing, delivery must follow closing).

## Move Map — Multi-Day ETA

Drive time is calculated from OSRM with a 0.8× correction factor. Any Stop location with an overnight checkbox is stored with a `[overnight]` notes prefix. The ETA splits the adjusted drive time across `overnightStops + 1` days of driving, each starting at the configured departure time (default 09:00).

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
│   ├── layout.tsx        # App shell (dark navy header, sidebar, mobile bottom nav)
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
