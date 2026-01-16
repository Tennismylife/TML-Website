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
  - `SITE_URL` – canonical site URL
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

---

## 🔁 Data import & scripts
- Data import scripts and utilities live in `/scripts` and `/Import Database/`. Use them for populating the DB.
- Example scripts: `generate-sitemap.js`, `print-sitemap.mjs`, import scripts for matches/players.

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