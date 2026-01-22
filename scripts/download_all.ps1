param(
  [string]$Site = $env:NEXT_PUBLIC_SITE_URL,
  [string]$OutDir = ".\tml-data"
)

if (-not $Site -or $Site -eq "") {
  $Site = 'https://stats.tennismylife.org'
}

$api = "$Site/api/data-files"
Write-Host "Fetching file list from $api"
try {
  $resp = Invoke-RestMethod -Uri $api -UseBasicParsing
} catch {
  Write-Error "Failed to fetch file list: $_"
  exit 1
}

if (-not $resp.files -or $resp.files.Count -eq 0) {
  Write-Host "No files found at $api"
  exit 0
}

if (-not (Test-Path -Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

foreach ($f in $resp.files) {
  $url = $f.url
  $name = $f.name
  $target = Join-Path $OutDir $name
  Write-Host "Downloading $name..."
  try {
    Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing
  } catch {
    Write-Warning "Failed to download $name: $_"
  }
}

Write-Host "Done. Files saved to: $OutDir"