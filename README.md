# Starland™ Moving

A private web app for Andrew, Tory, and Remy's move from Clearwater, FL to Cold Spring, NY in summer 2026. Tracks tasks, belongings, key dates, the move route, and timeline events — all behind a single shared password.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Postgres) for all storage
- **Tailwind CSS v4** with CSS custom properties design system
- **Leaflet** + **OSRM** for the interactive route map
- **Vitest** for tests
- **Deployed on Vercel**

## Design System — "Washi"

Warm paper tones throughout. Three key values: `#faf8f5` (content background), `#ede8df` (nav/header), `#ffffff` (card surfaces). Borders are quiet warm gray (`#ece8e1`). Terracotta (`#c06b3e`) is the single accent — CTAs, active nav states, progress bars. Gold (`#f0b432`) used only for key date markers on the timeline. Lora serif for headings, DM Sans for body. The "SL" monogram appears in the nav header and overview page.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Overview** | `/` | Mini milestone timeline, task completion stats by category, belonging sort progress by action |
| **The List** | `/tasks` | Tasks grouped by category; owner toggle per row (Andrew / Tory / unassigned); search and owner filter; collapsible completed section |
| **The Big Sort** | `/belongings` | Belongings grouped by room; action badges (Bring / Sell / Donate / Trash); action-specific resolve labels (Resolved / Sold / Donated / Trashed); search, action filter, and All / Active / Done segmented filter |
| **The Journey** | `/timeline` | Chronological timeline grouped by month; search and type filter (Key Dates / Events / Tasks); Confirmed / Estimated status chips; add and edit events inline |
| **The Route** | `/map` | Leaflet map with OSRM driving route polyline; per-leg drive time and distance in the side panel; multi-day ETA with editable departure time; add, edit, and delete locations; overnight stop encoding |

## Overview — Stats Panels

**The List panel** shows total task completion (fraction + progress bar) broken down by category with individual mini progress bars. Only categories with at least one task are shown.

**The Big Sort panel** shows total belonging resolution progress broken down by action (Bring / Sell / Donate / Trash) with mini progress bars. Only actions with at least one item appear.

## Key Date Rules

Seven milestones in fixed order: U-Pack Dropoff (FL) → U-Pack Pickup (FL) → Drive Start → Arrival (NY) → House Closing → U-Pack Delivery (NY) → U-Pack Final Pickup (NY). When dates are confirmed the API enforces ordering constraints (pickup must be exactly 3 days after dropoff; arrival must precede closing). Dates are editable from the Overview mini-timeline.

## Move Map — Routing & ETA

Drive time uses a **0.8× correction factor** on OSRM duration. Overnight stops are encoded as a `[overnight]` prefix in the location notes field. The ETA splits adjusted drive time across `overnightStops + 1` days of driving, each starting at the configured departure time (default 09:00). The side panel shows per-leg drive time and distance between each consecutive route stop.

Location categories: **Origin**, **Stop**, **Destination** (included in route), **Utility**, **Service**, **Errand** (displayed on map but not in route calculation). Stops are routed in insertion order.

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

44 tests across 5 files covering `dateUtils` validation logic and all API route handlers (belongings, tasks, events, settings, locations) using mocked Supabase.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         # Login / logout (cookie-based)
│   │   ├── belongings/   # Belongings CRUD
│   │   ├── categories/   # Task categories + tasks (combined GET)
│   │   ├── events/       # Timeline events CRUD
│   │   ├── locations/    # Map locations CRUD
│   │   ├── settings/     # Key dates / move settings
│   │   └── tasks/        # Tasks CRUD
│   ├── belongings/       # The Big Sort page
│   ├── login/            # Login page
│   ├── map/              # The Route page
│   ├── tasks/            # The List page
│   ├── timeline/         # The Journey page
│   ├── globals.css       # Design system (Washi theme)
│   ├── layout.tsx        # App shell — nav header, sidebar, mobile bottom nav, footer
│   └── page.tsx          # Overview / dashboard
├── components/
│   └── MoveMap.tsx       # Leaflet map component (client-only)
├── __tests__/            # Vitest test suite
└── lib/
    ├── dateUtils.ts      # Milestone helpers + date validation
    ├── supabase.ts       # Supabase client
    ├── types.ts          # Shared TypeScript types
    └── useScrollLock.ts  # Scroll lock hook for modals (iOS Safari safe)
```
