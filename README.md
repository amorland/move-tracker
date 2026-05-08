# Starland™ Moving

A private web app for Andrew, Tory, and Remy's move from Clearwater, FL to Cold Spring, NY in summer 2026. The app now covers both the move itself and parallel house-planning work: purchase/loan timeline tracking, document links, room planning, a crude visual layout planner, and future house projects. It also includes a dedicated car-planning workspace for assigning people, pets, and cargo across multiple vehicles. Access is gated by Google OAuth with a per-deployment email allowlist (`ALLOWED_EMAILS`), while private documents are intended to be stored as secure external links such as Google Drive URLs.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Postgres) for application data
- **Tailwind CSS v4** with CSS custom properties design system
- **Leaflet** + **OSRM** for the interactive route map
- **Vitest** for API and utility tests
- **Deployed on Vercel**

## Design System — "Washi 2.0"

The UI uses a minimal, cozy planning aesthetic: warm paper background (`#f7f3ed`), soft cream surfaces (`#fffdf9`), quiet beige navigation (`#eee7dc`), and border-first cards with restrained shadows. Terracotta (`#b85f36`) remains the primary action and active-state accent, while sage, muted blue, and gold tokens provide calmer status/type distinction where needed. Cards use tighter 8px radii, controls are more compact, rows lean on borders instead of heavy elevation, and modals keep the only strong floating shadow. Lora is reserved for page-level headings, DM Sans carries the working UI, and the "SL" monogram remains in the app header and overview page.

## Main Areas

| Area | Route | Description |
|------|-------|-------------|
| **HQ** | `/` | Command-center dashboard with quick links, move dates, the route summary, and execution status |
| **Tasks** | `/tasks` | Move and house-planning tasks with area filters, owner toggles, due dates, completion tracking, notes, and attached document links |
| **Stuff** | `/belongings` | Stuff with room toggles, room/outcome grouping, Bring / Sell / Donate / Trash actions, and progress filtering |
| **Timelines** | `/timeline` | Combined move, drive, task, event, and house-purchase timelines with type and area filters |
| **The Route** | `/map` | Leaflet map with OSRM routing, route stats, overnight stops, and trip ETA logic |
| **Cars** | `/drive-plan` | Car planner for assigning drivers, passengers, pets, bikes, plants, and cargo across the Mazda and Subaru |
| **House Planning** | `/home` | New-home planning dashboard focused on rooms, layout, projects, and house documents |
| **House Timeline** | `/home/timeline` | Redirects to the consolidated Timelines view filtered to Home Purchase |
| **House Tasks** | `/home/tasks` | Redirects to the consolidated Tasks view filtered to house-planning areas |
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
- route summary
- move execution cards for tasks and stuff

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

Document records are reusable. Adding a link from an attachment panel first checks for an existing saved document with the same normalized URL, then attaches that document to the current item. The same saved document can be attached to multiple tasks, events, and timeline entries without duplicating the document record.

To avoid collisions between old move tasks and new home planning tasks, the attachment model distinguishes between:

- `move_task`
- `planning_task`
- `event`
- `timeline_entry`

### Loan Document Import Workflow

The repo includes an offline import helper for reconciling loan-underwriting Google Drive manifests with exported Supabase tables. It does not connect to Supabase directly; instead, it generates a review report and SQL patch from local CSV exports.

Private CSVs and generated SQL should live under `data/`, which is git-ignored:

- `data/exports/documents_rows.csv`
- `data/exports/document_links_rows.csv`
- `data/exports/timeline_entries_rows.csv`
- `data/exports/planning_tasks_rows.csv`
- `data/exports/tracks_rows.csv`
- `data/imports/loan-underwriting-documents-manifest-*.csv`

Run:

```bash
python3 scripts/loan_document_import.py
```

Review `data/generated/loan-document-import-dry-run.md`, then run `data/generated/loan-document-import-apply.sql` in Supabase after `supabase-loan-documentation-log.sql` and `supabase-document-dedupe.sql` have been applied. The generated SQL contains private document URLs and should remain uncommitted unless intentionally promoted to a root-level Supabase patch.

### Consolidated Tasks And Timelines

Tasks and timelines now use top-level umbrella pages:

- `/timeline` shows move key dates, move events, move task due dates, drive stops, house-purchase timeline entries, and house-planning task due dates in one view.
- Home Purchase entries are loaded from the existing `timeline_entries` table and can be filtered with the `Home Purchase` chip.
- Move Events and house timeline entries share the same add/edit modal, so existing Event records can be converted into Home Purchase, Loan, or Home Updates entries and vice versa.
- `/tasks` shows both move tasks and `planning_tasks`, with filters for Move, Home Purchase, Loan, Home Setup, and Home Updates.
- `/home/timeline` and `/home/tasks` remain as compatibility routes that redirect into those filtered umbrella views.

### House Planning

The House area is focused on planning-specific work:

- room planning with `existing_belonging` and `planned_purchase` items
- a visual layout page that reuses room items and stores rough on-canvas placement
- future projects with status and priority tracking
- document links related to the house

The House subsection has its own local navigation for Rooms, Layout, Projects, and Documents. Timeline and task execution now live under the top-level Timelines and Tasks umbrellas instead of duplicating inside House.

When adding room items from existing belongings, the Rooms page now favors the common case:

- same-room suggestions first
- searchable belongings lookup
- full belongings grouped by old room

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

- [supabase-schema.sql](supabase-schema.sql)
- [supabase-migration.sql](supabase-migration.sql)
- [supabase-home-planning.sql](supabase-home-planning.sql)
- [supabase-loan-documentation-log.sql](supabase-loan-documentation-log.sql) — idempotent data patch for the BCU loan-documentation timeline log and related loan tasks
- [supabase-document-dedupe.sql](supabase-document-dedupe.sql) — adds document URL keys, merges duplicate document records by normalized URL, and creates uniqueness guards for reusable document attachments
- [supabase-loan-document-import.sql](supabase-loan-document-import.sql) — reviewed import patch that creates/links the loan underwriting Drive documents and consolidates duplicate loan-documentation timeline entries
- [supabase-rls.sql](supabase-rls.sql) — enables RLS + authenticated-only policies on all 16 tables

## Running Locally

Requires a `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ALLOWED_EMAILS=you@example.com,other@example.com
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

Current coverage is `89` tests across `16` files covering:

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
│   │   ├── auth/            # OAuth callback + logout (Supabase Auth)
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
│   │   ├── tasks/           # Redirects to top-level Tasks with house filters
│   │   ├── timeline/        # Redirects to top-level Timelines with house filters
│   │   └── page.tsx         # House dashboard
│   ├── auth/
│   │   └── callback/        # OAuth callback handler (exchanges code for session)
│   ├── login/               # Google sign-in page
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
    ├── supabase.ts          # Server-side Supabase client (session-aware, @supabase/ssr)
    ├── supabase-browser.ts  # Browser-side Supabase client (OAuth flows)
    ├── types.ts
    └── useScrollLock.ts
```

## Supabase Setup (required for auth)

1. In the Supabase dashboard, enable the **Google** OAuth provider under Authentication → Providers. Add your Google OAuth client ID and secret.
2. Add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback` for local dev) to the **Redirect URLs** allowlist under Authentication → URL Configuration.
3. Run `supabase-rls.sql` in the Supabase SQL editor to enable Row Level Security on all tables. Until this is done, RLS is off and the anon key has unrestricted access.
4. To seed the current BCU loan-documentation history, run `supabase-loan-documentation-log.sql` after `supabase-home-planning.sql`. The script checks existing Loan timeline/task titles before inserting, so it can be rerun without creating duplicates.
5. To enable database-level document reuse safeguards and clean up existing duplicate document URLs, run `supabase-document-dedupe.sql` after `supabase-home-planning.sql`.

## Current Limitations

- Documents are intended as external links, not uploaded private files
- Room planning and visual layout are still crude MVPs, not blueprint-accurate floorplan tools
- Drive planning does not currently enforce true seat/cargo constraints; it is a flexible planning board rather than a hard validator
- The app can seed planning structure from organized document sets, but document-derived updates still rely on review logic rather than full OCR / workflow automation
- Production build verification may require a non-sandboxed environment because Turbopack can fail under sandbox restrictions
