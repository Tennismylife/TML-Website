$list = @(
 'http://localhost:3000/records/count',
 'http://localhost:3000/records/ages/oldest',
 'http://localhost:3000/records/ages/youngest',
 'http://localhost:3000/records/ages/oldestWinners',
 'http://localhost:3000/records/ages/youngestWinners',
 'http://localhost:3000/records/timespan/entries',
 'http://localhost:3000/records/timespan/titles',
 'http://localhost:3000/records/timespan/rounds',
 'http://localhost:3000/records/percentage',
 'http://localhost:3000/records/same/wins',
 'http://localhost:3000/records/seasons/wins',
 'http://localhost:3000/records/seasons/entries',
 'http://localhost:3000/records/seasons/rounds',
 'http://localhost:3000/records/seasons/percentage',
 'http://localhost:3000/records/atage/wins',
 'http://localhost:3000/records/atage/entries',
 'http://localhost:3000/records/atage/titles',
 'http://localhost:3000/records/atage/slams',
 'http://localhost:3000/records/atage/rounds',
 'http://localhost:3000/records/ageofnth/entries',
 'http://localhost:3000/records/ageofnth/slams',
 'http://localhost:3000/records/ageofnth/rounds',
 'http://localhost:3000/records/neededto/titles',
 'http://localhost:3000/records/counterseasons/rounds',
 'http://localhost:3000/records/counterseasons/wins',
 'http://localhost:3000/records/counterseasons/titles',
 'http://localhost:3000/records/h2h/count',
 'http://localhost:3000/records/streak/wins',
 'http://localhost:3000/records/streak/rounds'
)

foreach ($u in $list) {
  Write-Output "\n--- $u ---"
  # Use the API endpoint to check JSON payloads instead of the rendered page HTML
  $api = $u -replace '^http://localhost:3000/records','http://localhost:3000/api/records'
  # Provide example query params for parameterized endpoints to exercise valid code paths
  $endpoint = $u -replace '^http://localhost:3000/records/',''
  switch ($endpoint) {
    'timespan/rounds' { $api = $api + '?round=F&limit=5'; break }
    'seasons/rounds' { $api = $api + '?round=F&limit=5'; break }
    'seasons/percentage' { $api = $api + '?minPlayed=1&limit=5'; break }
    'atage/wins' { $api = $api + '?age=30&limit=5'; break }
    'atage/entries' { $api = $api + '?age=30&limit=5'; break }
    'atage/titles' { $api = $api + '?age=30&limit=5'; break }
    'atage/rounds' { $api = $api + '?age=30&round=F&limit=5'; break }
    'ageofnth/entries' { $api = $api + '?n=3&limit=5'; break }
    'ageofnth/rounds' { $api = $api + '?n=3&round=F&limit=5'; break }
    'neededto/titles' { $api = $api + '?maxTitles=3&limit=5'; break }
    'counterseasons/rounds' { $api = $api + '?round=F&limit=5'; break }
    'streak/rounds' { $api = $api + '?round=F&limit=5'; break }
    default { }
  }
  Write-Output "checking API: $api"
  try {
    $r = Invoke-RestMethod -Uri $api -Method GET -TimeoutSec 10 -ErrorAction Stop

    function Has-Slug($obj) {
      if ($null -eq $obj) { return $false }
      if ($obj -is [string]) {
        try { $parsed = $obj | ConvertFrom-Json -ErrorAction Stop; $obj = $parsed } catch {}
      }
      if ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [string])) {
        foreach ($item in $obj) { if (Has-Slug $item) { return $true } }
        return $false
      } else {
        if ($obj -ne $null -and $obj.PSObject) {
          if ($obj.PSObject.Properties.Name -contains 'slug') { return $true }
          foreach ($prop in $obj.PSObject.Properties) {
            if (Has-Slug $prop.Value) { return $true }
          }
        }
        return $false
      }
    }

    $hasSlug = Has-Slug $r
    Write-Output "slug present anywhere: $hasSlug"

    if ($hasSlug) {
      function Find-SampleWithSlug($obj) {
        if ($null -eq $obj) { return $null }
        if ($obj -is [string]) {
          try { $parsed = $obj | ConvertFrom-Json -ErrorAction Stop; $obj = $parsed } catch {}
        }
        if ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [string])) {
          foreach ($item in $obj) { $res = Find-SampleWithSlug $item; if ($res) { return $res } }
          return $null
        } else {
          if ($obj -ne $null -and $obj.PSObject) {
            if ($obj.PSObject.Properties.Name -contains 'slug') { return $obj }
            foreach ($prop in $obj.PSObject.Properties) {
              $res = Find-SampleWithSlug $prop.Value; if ($res) { return $res }
            }
          }
          return $null
        }
      }
      $sample = Find-SampleWithSlug $r
      Write-Output "sample with slug:"
      $sample | ConvertTo-Json -Depth 5 | Write-Output
    } else {
      Write-Output "sample (top-level) excerpt:"
      $ex = $null
      if ($r -is [System.Array]) { $ex = $r[0] } else { $ex = $r }
      try { $ex | ConvertTo-Json -Depth 3 | Write-Output } catch { Write-Output "<could not JSON-convert sample>" }
    }
  } catch {
    Write-Output "ERROR: $($_.Exception.Message)"
  }
}
