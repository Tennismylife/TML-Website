const http = require('http');
const https = require('https');

const urls = [
  'https://stats.tennismylife.org/players/karim-alami?tab=matches&level=500&best_of=3&round=R64',
  'https://stats.tennismylife.org/players/H377?tab=matches',
  'https://stats.tennismylife.org/players/dominik-hrbaty?tab=matches',
  'https://stats.tennismylife.org/players/SS74',
  'https://stats.tennismylife.org/players/W023/matches',
  'https://stats.tennismylife.org/players/A479',
  'https://stats.tennismylife.org/players/alex-de-minaur?tab=matches&age=25.000&level=500&round=R32',
  'https://stats.tennismylife.org/players/stan-smith?tab=matches&surface=Grass&round=R64',
  'https://stats.tennismylife.org/players/carlos-alcaraz?tab=matches&level=500&surface=Clay',
  'https://stats.tennismylife.org/players/bjorn-borg?tab=matches&bestOf=3&n=50&round=R16',
  'https://stats.tennismylife.org/players/roger-federer?tab=matches&round=SF&surface=Grass',
  'https://stats.tennismylife.org/players/R548?tab=matches&n=1&surface=Grass',
  'https://stats.tennismylife.org/players/rajeev-ram?tab=matches&n=1&surface=Grass',
  'https://stats.tennismylife.org/players/gael-monfils?tab=matches&n=50&round=R128',
  'https://stats.tennismylife.org/players/M122?tab=matches&n=1&round=R64&surface=Carpet',
  'https://stats.tennismylife.org/players/bill-maze?tab=matches&n=1&round=R64&surface=Carpet',
  'https://stats.tennismylife.org/players/feliciano-lopez?tab=matches&result=Win&level=250&surface=Grass',
  'https://stats.tennismylife.org/players/gustavo-kuerten?level=F&surface=Hard',
  'https://stats.tennismylife.org/players/patrick-proisy?tab=matches&level=A&round=QF&surface=Clay',
  'https://stats.tennismylife.org/players/robert-casey?tab=matches&n=1&round=R64',
  'https://stats.tennismylife.org/players/G047?tab=matches&n=1&round=R32',
  'https://stats.tennismylife.org/players/gustavo-guerrero?tab=matches&n=1&round=R32',
  'https://stats.tennismylife.org/players/kei-nishikori?tab=matches&level=500&round=R64&surface=Grass',
  'https://stats.tennismylife.org/players/fabrice-santoro?tab=matches&result=Win&level=250&surface=Grass',
  'https://stats.tennismylife.org/players/ivan-lendl?tab=matches&level=G&round=R32',
  'https://stats.tennismylife.org/players/C044/matches?level=A&round=F',
  'https://stats.tennismylife.org/players/K023?tab=matches&n=1&round=R64',
  'https://stats.tennismylife.org/players/aaron-krickstein?tab=matches&n=1&round=R64',
  'https://stats.tennismylife.org/players/peter-smith-S343?tab=matches&n=1&round=R32',
  'https://stats.tennismylife.org/players/peter-smith?tab=matches&n=1&round=R32',
  'https://stats.tennismylife.org/players/Z355?tab=tournaments&round=W&level=500',
  'https://stats.tennismylife.org/players/alexander-zverev?tab=tournaments&round=W&level=500',
  'https://stats.tennismylife.org/players/N008/matches',
  'https://stats.tennismylife.org/records/counterseasons?subtab=titles',
  'https://stats.tennismylife.org/players/anders-jarryd?tab=matches&surface=Carpet&best_of=5&round=R16',
  'https://stats.tennismylife.org/players/raymond-moore?tab=matches',
  'https://stats.tennismylife.org/players/B058?tab=matches&level=A&round=R64',
  'https://stats.tennismylife.org/players/S145',
  'https://stats.tennismylife.org/players/bjorn-borg?tab=matches&level=A&round=R64',
  'https://stats.tennismylife.org/tournaments/683/1978',
  'https://stats.tennismylife.org/players/aaron-krickstein?tab=matches&n=50&round=R64',
  'https://stats.tennismylife.org/players/carlos-moya?tab=matches&level=250&round=SF&surface=Clay',
  'https://stats.tennismylife.org/players/vladimir-voltchkov?tab=matches&level=250&surface=Carpet',
  'https://stats.tennismylife.org/tournaments/6120/1994',
  'https://stats.tennismylife.org/players/hubert-hurkacz?tab=matches',
  'https://stats.tennismylife.org/players/richard-gasquet?tab=matches&bestOf=5&level=G&n=50&round=R64',
  'https://stats.tennismylife.org/players/R419/tournaments?round=R32',
  'https://stats.tennismylife.org/players/carey-brading',
  'https://stats.tennismylife.org/players/N008?tab=matches',
  'https://stats.tennismylife.org/players/ilie-nastase?tab=matches',
  'https://stats.tennismylife.org/players/felix-mantilla?tab=matches&level=500&round=R64',
  'https://stats.tennismylife.org/players/marc-rosset',
  'https://stats.tennismylife.org/players/P059/matches',
  'https://stats.tennismylife.org/players/G654',
  'https://stats.tennismylife.org/players/michal-tabara?tab=matches&level=250&round=QF',
  'https://stats.tennismylife.org/players/H432?level=M&surface=Hard',
  'https://stats.tennismylife.org/players/lleyton-hewitt?level=M&surface=Hard',
  'https://stats.tennismylife.org/players/Z355?tab=matches&level=F&round=R64&surface=Hard',
  'https://stats.tennismylife.org/players/alexander-zverev?tab=matches&level=F&round=R64&surface=Hard',
  'https://stats.tennismylife.org/players/david-wheaton?tab=matches',
  'https://stats.tennismylife.org/players/F472',
  'https://stats.tennismylife.org/players/L018/matches',
  'https://stats.tennismylife.org/players/R485?level=250&surface=Clay',
  'https://stats.tennismylife.org/players/andy-roddick?level=250&surface=Clay',
  'https://stats.tennismylife.org/players/tony-parun?tab=matches&level=A&round=R32&surface=Grass',
  'https://stats.tennismylife.org/players/rafael-nadal?tab=matches&level=250&round=SF&surface=Clay',
  'https://stats.tennismylife.org/players/jo-wilfried-tsonga?tab=matches&result=Win&level=250&surface=Hard',
  'https://stats.tennismylife.org/players/M094?tab=matches&round=R32'
];

function fetchUrl(url, maxRedirects = 10) {
  return new Promise((resolve) => {
    const visited = [];

    function doFetch(u, redirectsLeft) {
      const parsed = new URL(u);
      const lib = parsed.protocol === 'https:' ? https : http;
      const opts = {
        method: 'GET',
        headers: { 'User-Agent': 'sitemap-check/1.0' },
      };
      const req = lib.request(parsed, opts, (res) => {
        const { statusCode, headers } = res;
        visited.push({ statusCode, headers, url: u });
        if (statusCode >= 300 && statusCode < 400 && headers.location && redirectsLeft > 0) {
          let loc = headers.location;
          try { loc = new URL(loc, u).toString(); } catch(e) {}
          doFetch(loc, redirectsLeft - 1);
        } else {
          // consume body and finish
          res.on('data', () => {});
          res.on('end', () => resolve(visited));
        }
      });
      req.on('error', (err) => {
        resolve({ error: String(err), url: u, visited });
      });
      req.end();
    }

    doFetch(url, maxRedirects);
  });
}

(async () => {
  for (const u of urls) {
    process.stdout.write(`Checking ${u} ... `);
    try {
      const result = await fetchUrl(u);
      if (result.error) {
        console.log(`ERROR: ${result.error}`);
        continue;
      }
      const last = Array.isArray(result) ? result[result.length - 1] : null;
      if (!last) {
        console.log('No response');
        continue;
      }
      const redirected = result.length > 1;
      console.log(`Final ${last.statusCode} ${last.url} ${redirected ? `(redirected ${result.length - 1} times)` : ''}`);
    } catch (e) {
      console.log('ERROR', e.toString());
    }
  }
})();
