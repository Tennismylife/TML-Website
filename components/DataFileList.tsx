'use client';
import React from 'react';

// DataFileList: fetches /api/data-files and renders per-file download links
type DataFile = { name: string; url: string; size?: number; mtime?: string };

export default function DataFileList({ full = false }: { full?: boolean }) {
  const [files, setFiles] = React.useState<DataFile[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [visible, setVisible] = React.useState(20);
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);
  const cmdCmd = `mkdir tml-data & powershell -NoProfile -Command "Try { $files=(Invoke-RestMethod 'https://stats.tennismylife.org/api/data-files').files; New-Item -ItemType Directory -Path 'tml-data' -Force | Out-Null; foreach($f in $files){ Write-Host 'Downloading ' $f.name; Invoke-WebRequest -Uri $f.url -OutFile (Join-Path 'tml-data' $f.name) } } Catch { Write-Error $_.Exception.Message; exit 1 }"`;
  const psCmd = `New-Item -ItemType Directory -Force -Path .\\tml-data | Out-Null; Invoke-RestMethod -Uri 'https://stats.tennismylife.org/api/data-files' | Select-Object -ExpandProperty files | ForEach-Object { Invoke-WebRequest -Uri $_.url -OutFile (Join-Path -Path '.\\tml-data' -ChildPath $_.name) }`;
  const bashCmd = `mkdir -p tml-data && curl -s 'https://stats.tennismylife.org/api/data-files' | jq -r '.files[] | "\\(.url)\\t\\(.name)"' | while IFS=$'\\t' read -r url name; do curl -sSL "$url" -o "tml-data/$name"; done`;
  const showMore = () => setVisible((v) => v + 20);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/data-files');
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        if (mounted) setFiles(json.files || []);
      } catch (e: any) {
        console.error('Failed to list data files', e);
        if (mounted) setErr(String(e));
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (err) return <div style={{ color: 'red' }}>Error listing files</div>;
  if (!files) return <div>Loading files…</div>;
  if (files.length === 0) return <div>No CSV files found.</div>;

  // Helper to render human-readable sizes
  function humanSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
  // Prioritize certain files: ongoing_tourneys.csv (top) and ATP_Database.csv (last)
  const ongoing = files.find((f) => f.name.toLowerCase() === 'ongoing_tourneys.csv');
  const atpFile = files.find((f) => f.name.toLowerCase() === 'atp_database.csv');

  // Build a remaining set excluding prioritized files
  const remainingFiles = files.filter((f) => f.name.toLowerCase() !== 'ongoing_tourneys.csv' && f.name.toLowerCase() !== 'atp_database.csv');

  // Split historical year files (YYYY.csv) from other files
  const historical = remainingFiles
    .filter((f) => /^\d{4}\.csv$/i.test(f.name))
    .sort((a, b) => Number(b.name.replace(/[^0-9]/g, '')) - Number(a.name.replace(/[^0-9]/g, '')));

  const others = remainingFiles.filter((f) => !/^\d{4}\.csv$/i.test(f.name));

  // Prepare displayed list: put ongoing (if present) first, then historical years
  const displayedHistorical = ongoing ? [ongoing, ...historical] : historical;

  return (
    <div>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-100" style={{ marginTop: 0, marginBottom: 12 }}>Historical Matches (1968–2026)</h3>

      <div style={{ marginBottom: 12 }}>
        <div className="rounded-md bg-gray-800 border border-white/20 p-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold text-lg text-gray-100 mb-1">Quick commands</div>
              <div className="text-sm text-gray-400 mb-2">Copy & paste one of these commands to download all CSVs <strong>as they are</strong> into a <code>tml-data</code> folder. Choose the one matching your shell.</div>
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200 mb-1">CMD (Windows - cmd.exe)</div>
                    <pre className="bg-gray-900 text-sm p-3 rounded overflow-auto"><code>{cmdCmd}</code></pre>
                  </div>
                  <div className="flex-shrink-0">
                    <button onClick={async () => { try { await navigator.clipboard.writeText(cmdCmd); setCopyStatus('Copied CMD'); setTimeout(()=>setCopyStatus(null),2000); } catch (e) { setCopyStatus('Copy failed'); setTimeout(()=>setCopyStatus(null),2000); } }} className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow">Copy</button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200 mb-1">PowerShell (Windows)</div>
                    <pre className="bg-gray-900 text-sm p-3 rounded overflow-auto"><code>{psCmd}</code></pre>
                  </div>
                  <div className="flex-shrink-0">
                    <button onClick={async () => { try { await navigator.clipboard.writeText(psCmd); setCopyStatus('Copied PowerShell'); setTimeout(()=>setCopyStatus(null),2000); } catch (e) { setCopyStatus('Copy failed'); setTimeout(()=>setCopyStatus(null),2000); } }} className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow">Copy</button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200 mb-1">Bash / Linux / macOS</div>
                    <pre className="bg-gray-900 text-sm p-3 rounded overflow-auto"><code>{bashCmd}</code></pre>
                    <div className="text-xs text-gray-400 mt-1">Requires <code>curl</code> and <code>jq</code> (or Python fallback script available in <code>scripts/download_all.sh</code>).</div>
                  </div>
                  <div className="flex-shrink-0">
                    <button onClick={async () => { try { await navigator.clipboard.writeText(bashCmd); setCopyStatus('Copied Bash'); setTimeout(()=>setCopyStatus(null),2000); } catch (e) { setCopyStatus('Copy failed'); setTimeout(()=>setCopyStatus(null),2000); } }} className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-sm shadow">Copy</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <a href="/api/download-all" className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-4 px-10 rounded-xl text-xl sm:text-2xl shadow-xl">
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 11l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 21H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download All
          </a>
          <div className="text-sm text-gray-400 mt-2">Download all CSV files in a single ZIP file. This may take a few seconds.</div>
        </div>
      </div>
      <div style={{ maxWidth: 960, marginLeft: 'auto', marginRight: 'auto' }}>
        <div className="overflow-x-hidden rounded border border-white/30 bg-gray-900 shadow mt-0" style={{ marginBottom: 8 }}>
          <table className="table-fixed w-full border-collapse" aria-label="Historical Matches">
          <thead>
            <tr className="bg-black">
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 w-24">Year</th>
              <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200 w-36 sm:w-56">File</th>
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 w-28">Size</th>
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 w-48">Last modified</th>
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 w-auto sm:w-80"> </th>
            </tr>
          </thead>
          <tbody>
            {displayedHistorical.slice(0, visible).map((f) => {
              const isOngoing = f.name.toLowerCase() === 'ongoing_tourneys.csv';
              const yearLabel = isOngoing ? 'Ongoing' : f.name.replace(/\.csv$/i, '');
              return (
                <tr key={f.name} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 w-24 whitespace-nowrap">{yearLabel}</td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 whitespace-nowrap"><a href={f.url} download className="text-indigo-300 hover:underline whitespace-nowrap">{f.name}</a></td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 w-28 whitespace-nowrap">{f.size ? humanSize(f.size) : ''}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 w-48 whitespace-nowrap">{f.mtime ? new Date(f.mtime).toLocaleString('it-IT') : ''}</td>
                  <td className="border border-white/10 px-4 py-2 whitespace-nowrap w-auto sm:w-80 flex items-center justify-center">
                    <a href={f.url} download aria-label={`Download ${f.name}`} className="inline-flex items-center px-3 sm:px-4 py-1 text-sm sm:text-base bg-indigo-600 text-white rounded hover:bg-indigo-500 whitespace-nowrap">
                      <svg className="w-4 h-4 sm:mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 11l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 21H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </td>
                </tr>
              );
            })}

            {atpFile ? (
              <tr key={atpFile.name} className="hover:bg-gray-800 border-b border-white/10 font-semibold">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 w-24 whitespace-nowrap">ATP</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 whitespace-nowrap"><a href={atpFile.url} download className="text-indigo-300 hover:underline whitespace-nowrap">{atpFile.name}</a></td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 w-28 whitespace-nowrap">{atpFile.size ? humanSize(atpFile.size) : ''}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200 w-48 whitespace-nowrap">{atpFile.mtime ? new Date(atpFile.mtime).toLocaleString('it-IT') : ''}</td>
                <td className="border border-white/10 px-4 py-2 whitespace-nowrap w-auto sm:w-80 flex items-center justify-center">
                  <a href={atpFile.url} download aria-label={`Download ${atpFile.name}`} className="inline-flex items-center px-3 sm:px-4 py-1 text-sm sm:text-base bg-indigo-600 text-white rounded hover:bg-indigo-500 whitespace-nowrap">
                    <svg className="w-4 h-4 sm:mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 11l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 21H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </div>

      {historical.length > visible ? (
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <button onClick={showMore} className="px-4 py-2 bg-gray-700 text-white rounded border border-white/20 hover:bg-gray-600">Load more</button>
        </div>
      ) : null}


    </div>
  );
}