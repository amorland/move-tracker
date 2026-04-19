# Starland™ Moving

A private web app for Andrew, Tory, and Remy's move from Clearwater, FL to Cold Spring, NY in summer 2026. The app now covers both the move itself and parallel home-planning work: purchase/loan timeline tracking, document links, room planning, and future home projects. Access is gated by a shared app password, while private documents are intended to be stored as secure external links such as Google Drive URLs.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Postgres) for application data
- **Tailwind CSS v4** with CSS custom properties design system
- **Leaflet** + **OSRM** for the interactive route map
- **Vitest** for API and utility tests
- **Deployed on Vercel**

## Design System — "Washi"

Warm paper tones throughout. Three key values: `#faf8f5` (content background), `#ede8df` (nav/header), `#ffffff` (card surfaces). Borders are quiet warm gray (`#ece8e1`). Terracotta (`#c06b3e`) is the single accent for CTAs, active nav states, and progress bars. Gold (`#f0b432`) is reserved for key date markers. Lora serif for headings, DM Sans for body. The "SL" monogram appears in the nav header and overview page.

## Main Areas

| Area | Route | Description |
|------|-------|-------------|
| **Overview** | `/` | At-a-glance dashboard with Move Timeline, Drive Timeline, Home Timeline, move task completion, and belongings progress |
| **The List** | `/tasks` | Move tasks grouped by category with owner toggles, due dates, completion tracking, notes, and attached document links |
| **The Big Sort** | `/belongings` | Belongings grouped by room with Bring / Sell / Donate / Trash actions and progress filtering |
| **The Journey** | `/timeline` | Combined move timeline for key dates, tasks, custom events, and derived drive stops |
| **The Route** | `/map` | Leaflet map with OSRM routing, route stats, overnight stops, and trip ETA logic |
| **Home Planning** | `/home` | Home dashboard with summaries for timeline, tasks, and documents |
| **Home Timeline** | `/home/timeline` | Purchase, loan, and home update timeline entries with document attachments |
| **Home Tasks** | `/home/tasks` | Planning tasks for purchase, loan, setup, and updates with owner/status tracking and attachments |
| **Home Documents** | `/home/documents` | Central list of saved document links with category filters and attachment counts |
| **Rooms** | `/home/rooms` | Room-by-room planning for existing brought items and planned purchases |
| **Projects** | `/home/projects` | Future home improvement and renovation planning |

## Core Concepts

### Move Milestones

Seven milestones in fixed order:

`U-Pack Dropoff (FL) → U-Pack Pickup (FL) → Drive Start → Arrival (NY) → House Closing → U-Pack Delivery (NY) → U-Pack Final Pickup (NY)`

When dates are confirmed the API enforces ordering constraints:

- U-Pack pickup must be exactly 3 days after dropoff
- arrival must precede closing
- U-Pack delivery must follow closing
- final pickup must be exactly 3 days after delivery

### Drive Timeline

Drive time uses a `0.8x` correction factor on OSRM duration. Overnight stops are encoded with a `[overnight]` prefix in location notes. The route panel and the timeline both derive drive-day entries from the stored route stops.

### Documents

The app supports generic document links plus attachment records. The intended use is private Google Drive links or other secure external document URLs rather than storing private files directly in-app.

Attachable entities currently include:

- move tasks
- move events
- home timeline entries

The Home Documents page provides a central library view over saved links.

### Home Planning

The Home area is split into:

- timeline entries for purchase, loan, and updates
- planning tasks grouped into `purchase`, `loan`, `home_setup`, and `updates`
- room planning with `existing_belonging` and `planned_purchase` items
- future projects with status and priority tracking

## Data Model

The current app uses these major tables:

- `settings`
- `categories`
- `tasks`
- `belongings`
- `events`
- `locations`
- `tracks`
- `timeline_entries`
- `planning_tasks`
- `documents`
- `document_links`
- `rooms`
- `room_items`
- `home_projects`

The repo includes the legacy base schema and migration files plus the newer home-planning expansion:

- [supabase-schema.sql](/home/amorland/move-tracker/supabase-schema.sql:1)
- [supabase-migration.sql](/home/amorland/move-tracker/supabase-migration.sql:1)
- [supabase-home-planning.sql](/home/amorland/move-tracker/supabase-home-planning.sql:1)

## Running Locally

Requires a `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
APP_PASSWORD=...
```

```bash
npm install
npm run dev
```

The dev server binds to `0.0.0.0:3000`.

## Tests

```bash
npm test
npm run test:watch
```

Current coverage is `68` tests across `11` files covering:

- `dateUtils` milestone validation
- move API routes: belongings, tasks, events, settings
- home API routes: documents, timeline, planning tasks, rooms, room items, home projects

Tests use mocked Supabase clients rather than a live database.

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/            # Login / logout (cookie-based)
│   │   ├── belongings/      # Belongings CRUD
│   │   ├── categories/      # Move task categories + tasks (combined GET)
│   │   ├── document-links/  # Generic attachment links
│   │   ├── documents/       # Generic document link records
│   │   ├── events/          # Move timeline event CRUD
│   │   ├── home-projects/   # Future home project CRUD
│   │   ├── locations/       # Map locations CRUD
│   │   ├── planning-tasks/  # Home planning task CRUD
│   │   ├── room-items/      # Room planning item CRUD
│   │   ├── rooms/           # Room CRUD
│   │   ├── settings/        # Move key dates / settings
│   │   ├── tasks/           # Move tasks CRUD
│   │   ├── timeline/        # Home timeline CRUD
│   │   └── tracks/          # Track metadata
│   ├── belongings/          # The Big Sort page
│   ├── home/
│   │   ├── documents/       # Home documents page
│   │   ├── projects/        # Home projects page
│   │   ├── rooms/           # Room planning page
│   │   ├── tasks/           # Home tasks page
│   │   ├── timeline/        # Home timeline page
│   │   └── page.tsx         # Home dashboard
│   ├── login/               # Login page
│   ├── map/                 # Route page
│   ├── tasks/               # Move tasks page
│   ├── timeline/            # Move timeline page
│   ├── globals.css          # Design system
│   ├── layout.tsx           # App shell
│   └── page.tsx             # Main overview dashboard
├── components/
│   ├── DocumentAttachmentSection.tsx
│   ├── HomeSubnav.tsx
│   └── MoveMap.tsx
├── __tests__/
│   └── api/                 # Route handler tests
└── lib/
    ├── dateUtils.ts
    ├── supabase.ts
    ├── types.ts
    └── useScrollLock.ts
```

## Current Limitations

- App authentication is still a shared password cookie, not per-user auth
- Documents are intended as external links, not uploaded private files
- Room planning is a room-and-item MVP, not a blueprint-aware floorplan editor
- Production build verification may require a non-sandboxed environment because Turbopack can fail under sandbox restrictions
