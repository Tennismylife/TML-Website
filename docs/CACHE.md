# Cache System (tennis-cache)

Overview:
- Server uses an Express wrapper (`server.js`) in front of Next.js to provide Redis-backed page and API caching.
- The middleware logs `[CACHE HIT]`, `[CACHE MISS]`, `[CACHE STORED]` and skips saving incomplete HTML.

Key env variables (set in your production env):
- `REDIS_URL` - Redis connection URL (e.g., `redis://127.0.0.1:6379`).
- `CACHE_TTL_SECONDS` - optional TTL for cached entries (0 = no TTL, default 0).
- `CACHE_PRELOAD` - set to `1` to enable preload & warming on startup and periodic refresh.
- `CACHE_PRELOAD_HOURS` - how often (hours) to refresh preloaded pages (default 12).
- `PRELOAD_ALL_TOURNAMENTS` - set to `1` to warm the `ages/main` page for all tournaments found in the slug-map.
- `PRELOAD_PATHS` - comma-separated list of paths to warm (defaults to `/tournaments/australian-open/records/ages/main`).
- `CACHE_SECRET` - optional secret used by the cache API endpoints for invalidation and refresh operations.

Endpoints (Next API routes):
- POST `/api/cache/invalidate` - body JSON: `{ secret, pattern?, paths?, all? }`.
  - `all: true` will delete all `tennismylife:*` keys.
  - `pattern: 'australian-open'` will delete keys that contain the pattern.
  - `paths: ['/tournaments/australian-open/records/ages/main']` will delete keys matching those paths.

- POST `/api/cache/refresh` - body JSON: `{ secret, paths: ['/tournaments/australian-open/records/ages/main'], origin? }`.
  - This triggers an internal GET with header `x-revalidate: 1` to force page regeneration and store the fresh HTML in cache.

Examples:

- Invalidate single page:
  curl -X POST http://localhost:3000/api/cache/invalidate -H 'Content-Type: application/json' -d '{"secret":"YOUR_SECRET","paths":["/tournaments/australian-open/records/ages/main"]}'

- Refresh single page (regenerate and store):
  curl -X POST http://localhost:3000/api/cache/refresh -H 'Content-Type: application/json' -d '{"secret":"YOUR_SECRET","paths":["/tournaments/australian-open/records/ages/main"]}'

Notes:
- The server will not cache streaming responses, RSC components, or incomplete HTML (HTML without `__NEXT_DATA__`).
- Preload will also fetch `/api/slug-map` and store it in Redis under `slug_map_v1` to avoid frequent DB hits.
- If you need immediate invalidation when data changes (e.g., a tournament row is updated), call the invalidate endpoint from your data update job with the appropriate `secret`.

Logging:
- The server logs `[CACHE MISS]` when a cached key is missing, `[CACHE HIT]` when served from cache, and `[CACHE STORED]` when a fresh response is saved.

If you'd like, I can add a small admin script (Node) to call `/api/cache/refresh` for a list of pages on deploy or hook into your data update process to automate invalidation.
