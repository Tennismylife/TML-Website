# Tennis My Life

**Tennis My Life** is an open‑source project that collects, processes, and serves historical and current tennis statistics in a fast, searchable, and programmatic way. The site aggregates matches, rankings, records (age, points, streaks, wins, etc.), player profiles, and tournament data, exposing them through optimized pages and lightweight APIs.

---

## 🚀 Key features
- Detailed views: `Players`, `Tournaments`, `Records`, `Rankings`, `Statistics`, `Seasons`.
- Dynamic pages with filters by period, round, level and surface; exportable tables and summarized reports.
- Internal APIs and special routes: `sitemap`, OG images, Matomo endpoints.
- Robust flag rendering (Twemoji images with emoji fallback).

---

## 🔧 Tech stack
- Framework: **Next.js (App Router)**
- Language: **TypeScript**
- DB / ORM: **Prisma** (Postgres recommended)
- Styling: **Tailwind CSS**
- Tests: **Vitest** (Playwright for optional E2E)
- Deployment: Docker / PM2 recommended

---

## ⚙️ Quick start (local)
1. Clone

```bash
git clone <repo-url>
cd TML-Website
```

2. Install

```bash
npm install
```

3. Environment

- Create a `.env` file based on `.env.example` and set database and other secrets.
- Useful env flags:
  - `NEXT_PUBLIC_SITE_URL` – canonical site URL (e.g. `https://stats.tennismylife.org`). **Setta questo valore in produzione** per garantire che i redirect nel middleware puntino direttamente all'host canonico.
  - `DATABASE_URL` – connection string for Prisma
  - `SKIP_SITEMAP_BUILD` – set to `1` to short-circuit sitemap generation during constrained builds

4. Dev

```bash
npm run dev
```

5. Build (production)

```bash
npm run build
npm start
```

> Tip: while developing on constrained machines/CI, use `SKIP_SITEMAP_BUILD=1 npm run build` to avoid long sitemap generation.

---

## 🗄 Database & Prisma
- Migrations and client are handled with Prisma. Typical flow:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

- The project includes import scripts under the `scripts/` and `Import Database/` folders to import matches/players/rankings.

---

## 📄 Sitemap
- There are two routes: `app/sitemap.xml/route.ts` and `app/api/sitemap/route.ts` that call `lib/sitemap.ts`.
- To avoid long builds, `SKIP_SITEMAP_BUILD=1` returns a minimal sitemap during build time; the full sitemap can be generated at runtime or via CLI scripts.

## 🔍 SEO – IndexNow support
- The project includes a lightweight helper in `lib/indexnow.ts` you can use to notify Bing, Yandex or other
  IndexNow‑compatible crawlers when pages change.
- Typical workflow: export `INDEXNOW_KEY` and `INDEXNOW_KEY_LOCATION` (URL of the public key file in `public/`)
  and call `notifyIndexNow([...urls], key, keyLocation)` from your build/deploy script or a webhook.  The helper now uses a JSON body (`{host,key,keyLocation,urlList}`) to satisfy the
  latest IndexNow API requirements and avoid 400 errors.
- Example snippet:
  ```ts
  import { notifyIndexNow } from './lib/indexnow';

  const key = process.env.INDEXNOW_KEY!; // e.g. "2fba6905fae..."
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION!; // https://example.com/2fba6905fae24d74a6e4294729e371a8.txt

  // after publishing a new article or regenerating sitemap
  await notifyIndexNow([
    'https://example.com/new-post',
    'https://example.com/another-page',
  ], key, keyLocation);
  ```

For simpler invocation there’s also `scripts/notify-indexnow.ts` that reads the env vars and
posts a list passed via command line.  It can operate in two modes:

* **explicit URLs** – supply them directly:

  ```bash
  npm run notify:indexnow -- https://example.com/foo https://example.com/bar
  ```

* **sitemap-derived** – generate the URL list automatically from your sitemap.  (Requires
  `NEXT_PUBLIC_SITE_URL` or `SITE_URL` env var to be set so the full host can be prepended.)

  ```bash
  npm run notify:indexnow -- --sitemap
  ```

The script uses `lib/getSitemapEntries()` internally.  You can also combine both modes by
passing `--sitemap` plus additional URLs on the command line.

* **h2h‑top100 sitemap** – generate a dedicated sitemap listing every possible
  head‑to‑head matchup between the current top‑100 players.  Pairings are
  alphabetized (A vs B, not B vs A) and slugs are used in the URL.

  ```bash
  node scripts/sitemap/generate-sitemap-h2h-top100.js
  ```

  The output is written to `public/sitemaps/sitemap-h2h-top100.xml` (and `.gz`),
  and the sitemap index is updated automatically.

---

## 🔁 Data import & scripts
- Data import scripts and utilities live in `/scripts` and `/Import Database/`. Use them for populating the DB.
- Example scripts: `generate-sitemap.js`, `print-sitemap.mjs`, import scripts for matches/players.
> ⚠️ **Performance note:** the full sitemap generator hits the database heavily (players,
> tournaments, records, season aggregations) and can take several minutes on large datasets.
> For builds on constrained machines use `SKIP_SITEMAP_BUILD=1` or run the slower generators
> offline (`node scripts/sitemap/generate-sitemap.js` or
> `scripts/sitemap/regenerate-all-sitemaps.js`) once and cache the result in `public/`.
> The `notify-indexnow` helper will automatically read any existing sitemap XML in `public/`
> if available, avoiding the cost of regenerating it from scratch.
---

## 🧪 Testing
- Unit tests: `npm test` (Vitest)
- For E2E: recommended Playwright setup (optional)

---

## 🐳 Deployment (Docker / PM2)
- Dockerfile and `docker-compose.yml` are included for container-based deployment.

Example quick start (Docker):

```bash
docker build -t tml-web .
docker run -e DATABASE_URL='<your-db>' -p 3000:3000 tml-web
```

PM2 example (production):

```bash
npm run build
npm install pm2 -g
pm2 start npm --name tml -- start
```

---

## 📡 API examples
- `GET /api/players` – players list
- `GET /api/matches/latest` – latest matches
- `GET /sitemap.xml` – pre-rendered sitemap route (or minimal sitemap if `SKIP_SITEMAP_BUILD=1`)

(See in-repo `app/api` for full endpoints and JSON schema shapes.)

---

## 📥 Download all CSVs — one-line commands (any user)
Want all CSVs as they are (no ZIP)? Paste one of these commands in your shell and the files will be downloaded with their original names.

- CMD (Windows, copy to cmd.exe):

```cmd
mkdir tml-data & powershell -NoProfile -Command "Try { $files=(Invoke-RestMethod 'https://stats.tennismylife.org/api/data-files').files; New-Item -ItemType Directory -Path 'tml-data' -Force | Out-Null; foreach($f in $files){ Write-Host 'Downloading ' $f.name; Invoke-WebRequest -Uri $f.url -OutFile (Join-Path 'tml-data' $f.name) } } Catch { Write-Error $_.Exception.Message; exit 1 }"
```

- PowerShell (Windows):

```powershell
New-Item -ItemType Directory -Force -Path .\tml-data | Out-Null; Invoke-RestMethod -Uri 'https://stats.tennismylife.org/api/data-files' | Select-Object -ExpandProperty files | ForEach-Object { Invoke-WebRequest -Uri $_.url -OutFile (Join-Path -Path '.\tml-data' -ChildPath $_.name) }
```

- Bash / WSL / macOS (requires `curl` + `jq`):

```bash
mkdir -p tml-data && curl -s 'https://stats.tennismylife.org/api/data-files' | jq -r '.files[] | "\(.url)\t\(.name)"' | while IFS=$'\t' read -r url name; do curl -sSL "$url" -o "tml-data/$name"; done
```

Notes:
- Replace `https://stats.tennismylife.org` with your site URL if needed (e.g., `http://localhost:3000` for local dev).
- For a packaged option, see `scripts/download_all.ps1` and `scripts/download_all.sh` in this repo (they download files *as-is* into a `tml-data` folder).

---

---

## 🤝 Contributing
- Fork → branch → PR. Please:
  - Include tests for logic added/changed
  - Run `npm test` locally
  - Keep changes small and focused

See `CONTRIBUTING.md` for details.

---

## 🧾 License
See `LICENSE` in the repository root.

---

If you'd like, I can also:
- generate a full **README** file in the repo (I can add it now),
- prepare a **CONTRIBUTING.md** template,
- or add a **Deployment** doc with Docker / CI examples.

Which would you like next? ✅