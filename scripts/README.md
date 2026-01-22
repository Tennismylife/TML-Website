# Download all CSV scripts

Two small convenience scripts to download all CSV files directly (no ZIP) from the site `api/data-files` endpoint.

PowerShell (Windows):

Usage (default site is https://stats.tennismylife.org):

```powershell
# default
.\scripts\download_all.ps1

# specify site and output folder
.\scripts\download_all.ps1 -Site 'https://stats.tennismylife.org' -OutDir '.\tml-data'
```

Bash (Linux / macOS / WSL / Git Bash):

Requirements: `curl` and preferably `jq` (if `jq` is missing, the script falls back to Python). Make it executable first (`chmod +x scripts/download_all.sh`).

```bash
# default (uses NEXT_PUBLIC_SITE_URL env or https://stats.tennismylife.org)
./scripts/download_all.sh

# specify site and directory
./scripts/download_all.sh https://stats.tennismylife.org tml-data
```

Behavior:
- Scripts call `GET /api/data-files` to enumerate CSV URLs and then download each file to the output directory preserving the original filenames.
- They skip compression and download CSVs "as they are".

If you want, I can also add a single-line one-off command to `README.md` or add a `npm` script entry (e.g., `npm run download:csvs`).