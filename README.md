# Starland™ Moving

A private web app for Andrew, Tory, and Remy's move from Clearwater, FL to Cold Spring, NY in summer 2026. The app now covers both the move itself and parallel house-planning work: purchase/loan timeline tracking, document links, room planning, a crude visual layout planner, and future house projects. It also includes a dedicated car-planning workspace for assigning people, pets, and cargo across multiple vehicles. Access is gated by a shared app password, while private documents are intended to be stored as secure external links such as Google Drive URLs.

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
| **HQ** | `/` | Command-center dashboard with quick links, move dates, house progress, execution status, and the route summary |
| **The List** | `/tasks` | Move tasks grouped by category with owner toggles, due dates, completion tracking, notes, and attached document links |
| **Stuff** | `/belongings` | Stuff grouped by room with Bring / Sell / Donate / Trash actions and progress filtering |
| **The Journey** | `/timeline` | Combined move timeline for key dates, tasks, custom events, and derived drive stops |
| **The Route** | `/map` | Leaflet map with OSRM routing, route stats, overnight stops, and trip ETA logic |
| **Cars** | `/drive-plan` | Car planner for assigning drivers, passengers, pets, bikes, plants, and cargo across the Mazda and Subaru |
| **House Planning** | `/home` | House HQ with purchase progress, summaries, and navigation into the dedicated House subsection |
| **House Timeline** | `/home/timeline` | Purchase, loan, and house update entries shown in a vertical timeline layout with document attachments |
| **House Tasks** | `/home/tasks` | Planning tasks for purchase, loan, setup, and updates with grouped filters, owner/status tracking, and attachments |
| **House Documents** | `/home/documents` | Central list of saved document links with category filters and attachment counts |
| **Rooms** | `/home/rooms` | Room-by-room planning for existing brought items and planned purchases |
| **Visual Layout** | `/home/layout` | Crude drag-and-drop room layout planner built on top of saved rooms and room items |
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

### HQ Layout

The main `HQ` page is structured to keep the highest-signal items first:

- quick links to the main work areas
- move timeline
- home purchase timeline
- move execution cards for tasks and stuff
- route summary at the bottom

The idea is that `HQ` works as a command center rather than a landing page full of full-detail widgets.

### Drive Timeline

Drive time uses a `0.8x` correction factor on OSRM duration. Overnight stops are encoded with a `[overnight]` prefix in location notes. The route panel and the timeline both derive drive-day entries from the stored route stops.

On the main Overview page, the Route widget now:

- keeps the first overnight on the same calendar day as drive start
- shows the per-day drive time between each overnight stop
- calculates the final-day arrival from the actual last drive segment rather than an even split

### Car Planning

The app includes a separate `Cars` workspace for convoy planning. It models:

- vehicles
- people and pets
- cargo and vehicle add-ons
- per-item assignment to a vehicle

The planner is meant for trying different trip configurations such as who drives which car, where the dogs ride, whether an extra driver is needed, and what large trip cargo should go in each vehicle.

### Documents And Attachments

The app supports generic document links plus attachment records. The intended use is private Google Drive links or other secure external document URLs rather than storing private files directly in-app.

Attachable entities currently include:

- move tasks
- home planning tasks
- move events
- home timeline entries

The Home Documents page provides a central library view over saved links.

To avoid collisions between old move tasks and new home planning tasks, the attachment model distinguishes between:

- `move_task`
- `planning_task`
- `event`
- `timeline_entry`

### House Planning

The House area is split into:

- timeline entries for purchase, loan, and updates
- planning tasks grouped into `purchase`, `loan`, `home_setup`, and `updates`
- room planning with `existing_belonging` and `planned_purchase` items
- a visual layout page that reuses room items and stores rough on-canvas placement
- future projects with status and priority tracking

The House subsection has its own local navigation and is meant to feel like a nested planning workspace inside the broader move app rather than a set of isolated standalone pages. Its local home tab is labeled `HQ`.

## Data Model

The current app uses these major tables:

- `settings`
- `categories`
- `tasks`
- `belongings`
- `events`
- `locations`
- `drive_vehicles`
- `drive_loadout_items`
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

Current coverage is `76` tests across `13` files covering:

- `dateUtils` milestone validation
- move API routes: belongings, tasks, events, settings
- home API routes: documents, timeline, planning tasks, rooms, room items, home projects
- drive-planning API routes: drive vehicles and drive loadout items

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
│   │   ├── drive-loadout-items/ # Drive planner cargo/passenger items
│   │   ├── drive-vehicles/  # Drive planner vehicles
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
│   ├── belongings/          # Stuff page
│   ├── drive-plan/          # Cars page
│   ├── home/
│   │   ├── documents/       # House documents page
│   │   ├── layout/          # Visual room layout planner
│   │   ├── projects/        # House projects page
│   │   ├── rooms/           # Room planning page
│   │   ├── tasks/           # House tasks page
│   │   ├── timeline/        # House timeline page
│   │   └── page.tsx         # House dashboard
│   ├── login/               # Login page
│   ├── map/                 # Route page
│   ├── tasks/               # Move tasks page
│   ├── timeline/            # Move timeline page
│   ├── globals.css          # Design system
│   ├── layout.tsx           # App shell
│   └── page.tsx             # Main HQ dashboard
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
- Room planning and visual layout are still crude MVPs, not blueprint-accurate floorplan tools
- Drive planning does not currently enforce true seat/cargo constraints; it is a flexible planning board rather than a hard validator
- The app can seed planning structure from organized document sets, but document-derived updates still rely on review logic rather than full OCR / workflow automation
- Production build verification may require a non-sandboxed environment because Turbopack can fail under sandbox restrictions
