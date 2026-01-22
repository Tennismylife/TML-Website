## Tennis Match Database Integration

Overview:
- CSV files live in the project's `data/` directory: `matches.csv`, `players.csv`, `rankings.csv`.
- The server exposes these files via `/data/<file>.csv` (served from the site domain).
- API endpoint `/api/matches` returns JSON filtered by query parameters `player`, `year`, `surface`.

API examples:
- /api/matches?player=Federer
- /api/matches?year=2006&surface=Clay

Front-end:
- New page at `/tennis-match-database`.
- Client component fetches `/api/matches` and provides filters, sorting and CSV download links.

Deployment notes:
- Ensure that `data/` is included in deployments (not ignored by .gitignore) and contains the CSVs.
- Set environment variable `NEXT_PUBLIC_SITE_URL` to the canonical site URL for accurate JSON-LD dataset `contentUrl` in the page head.
- Consider adding a script to periodically update or validate CSVs if data changes frequently.