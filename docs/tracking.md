# Server-side AdBlock-proof visit tracking

This project includes a lightweight AdBlock-proof visit tracking system that stores visits in Postgres and works server-side (via Next.js middleware), and client-side for SPA navigations.

## Components

- Edge middleware (`middleware.ts`)
  - Runs on GET requests (skips `/api/`, `/_next/`, `/favicon.ico`)
  - Derives `pageTitle` from URL path (`/` -> `Home`, `/players/novak-djokovic` -> `players novak djokovic`)
  - Filters common bots: `/(bot|crawl|spider|slurp|curl|wget)/i`
  - Sends fire-and-forget `POST /api/track-visit` with headers `x-original-user-agent`, `x-original-ip` and body `{ pageTitle, pageUrl }`
  - Does not block or change other middleware logic

- Server API route (`app/api/track-visit/route.ts`)
  - Accepts POST with `{ pageTitle, pageUrl }` and forwarded headers
  - Calls `trackVisit()` from `lib/visitTracker.ts` in a non-blocking way
  - Returns `{ ok: true }` (200) even if DB insert later fails

- DB insert helper (`lib/visitTracker.ts`)
  - Exports `async trackVisit(req, pageTitle?)` and `trackVisitMiddleware()` for Express
  - Extracts user agent, IP, and page URL from `req` (Next Request, standard Request, or Express Request)
  - Filters common bots on the server side and performs insert into `tracking_schema.visits`
  - Handles errors and returns `true` when inserted, `false` otherwise

- Client hook (`lib/hooks/useTrackPageView.tsx`) and component (`app/TrackPageClient.tsx`)
  - Hook listens to route changes (app router `usePathname`) and fires a `POST /api/track-visit` on initial load and each route change
  - Component is included in `app/layout.tsx`

## Database migration

A SQL migration is provided at `prisma/migrations/20260111_create_tracking_schema/migration.sql` which creates the `tracking_schema` schema and the `visits` table:

```sql
CREATE SCHEMA IF NOT EXISTS tracking_schema;
CREATE TABLE IF NOT EXISTS tracking_schema.visits (
  id SERIAL PRIMARY KEY,
  page_url TEXT,
  page_title TEXT,
  user_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Apply it with:

psql "$DATABASE_URL" -f ./prisma/migrations/20260111_create_tracking_schema/migration.sql

If you want to use Prisma migrations, add the following model to `prisma/schema.prisma` (see README in the migration folder) and run `prisma migrate dev --name create-tracking-schema`.

## Notes

- The Edge middleware does not import Prisma (to avoid bundling Prisma into the Edge runtime). The actual DB insert is handled by the server API route and `lib/visitTracker.ts` (which uses Prisma).
- All tracking calls are fire-and-forget (non-blocking and resilient to DB failures).
- If you want stricter privacy or sampling, modify `lib/visitTracker.ts` accordingly.

---
If you want, I can add a Prisma model to `schema.prisma` and generate a proper Prisma migration file, or add an integration test that runs against a test Postgres instance. Which would you prefer next?