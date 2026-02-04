import { test, expect } from '@playwright/test';

const urls = [
  '/players/karim-alami?tab=matches&level=500&best_of=3&round=R64',
  '/players/H377?tab=matches',
  '/players/dominik-hrbaty?tab=matches',
  '/players/SS74',
  '/players/W023/matches',
  '/players/A479',
  '/players/alex-de-minaur?tab=matches&age=25.000&level=500&round=R32',
  '/players/stan-smith?tab=matches&surface=Grass&round=R64',
  '/players/carlos-alcaraz?tab=matches&level=500&surface=Clay',
  '/players/bjorn-borg?tab=matches&bestOf=3&n=50&round=R16',
  '/players/roger-federer?tab=matches&round=SF&surface=Grass',
  '/players/R548?tab=matches&n=1&surface=Grass',
  '/players/rajeev-ram?tab=matches&n=1&surface=Grass',
  '/players/gael-monfils?tab=matches&n=50&round=R128',
  '/players/M122?tab=matches&n=1&round=R64&surface=Carpet',
  '/players/bill-maze?tab=matches&n=1&round=R64&surface=Carpet',
  '/players/feliciano-lopez?tab=matches&result=Win&level=250&surface=Grass',
  '/players/gustavo-kuerten?level=F&surface=Hard',
  '/players/patrick-proisy?tab=matches&level=A&round=QF&surface=Clay',
  '/players/robert-casey?tab=matches&n=1&round=R64',
  '/players/G047?tab=matches&n=1&round=R32',
  '/players/gustavo-guerrero?tab=matches&n=1&round=R32',
  '/players/kei-nishikori?tab=matches&level=500&round=R64&surface=Grass',
  '/players/fabrice-santoro?tab=matches&result=Win&level=250&surface=Grass',
  '/players/ivan-lendl?tab=matches&level=G&round=R32',
  '/players/C044/matches?level=A&round=F',
  '/players/K023?tab=matches&n=1&round=R64',
  '/players/aaron-krickstein?tab=matches&n=1&round=R64',
  '/players/peter-smith-S343?tab=matches&n=1&round=R32',
  '/players/peter-smith?tab=matches&n=1&round=R32',
  '/players/Z355?tab=tournaments&round=W&level=500',
  '/players/alexander-zverev?tab=tournaments&round=W&level=500',
  '/players/N008/matches',
  '/records/counterseasons?subtab=titles',
  '/players/anders-jarryd?tab=matches&surface=Carpet&best_of=5&round=R16',
  '/players/raymond-moore?tab=matches',
  '/players/B058?tab=matches&level=A&round=R64',
  '/players/S145',
  '/players/bjorn-borg?tab=matches&level=A&round=R64',
  '/tournaments/683/1978',
  '/players/aaron-krickstein?tab=matches&n=50&round=R64',
  '/players/carlos-moya?tab=matches&level=250&round=SF&surface=Clay',
  '/players/vladimir-voltchkov?tab=matches&level=250&surface=Carpet',
  '/tournaments/6120/1994',
  '/players/hubert-hurkacz?tab=matches',
  '/players/richard-gasquet?tab=matches&bestOf=5&level=G&n=50&round=R64',
  '/players/R419/tournaments?round=R32',
  '/players/carey-brading',
  '/players/N008?tab=matches',
  '/players/ilie-nastase?tab=matches',
  '/players/felix-mantilla?tab=matches&level=500&round=R64',
  '/players/marc-rosset',
  '/players/P059/matches',
  '/players/G654',
  '/players/michal-tabara?tab=matches&level=250&round=QF',
  '/players/H432?level=M&surface=Hard',
  '/players/lleyton-hewitt?level=M&surface=Hard',
  '/players/Z355?tab=matches&level=F&round=R64&surface=Hard',
  '/players/alexander-zverev?tab=matches&level=F&round=R64&surface=Hard',
  '/players/david-wheaton?tab=matches',
  '/players/F472',
  '/players/L018/matches',
  '/players/R485?level=250&surface=Clay',
  '/players/andy-roddick?level=250&surface=Clay',
  '/players/tony-parun?tab=matches&level=A&round=R32&surface=Grass',
  '/players/rafael-nadal?tab=matches&level=250&round=SF&surface=Clay',
  '/players/jo-wilfried-tsonga?tab=matches&result=Win&level=250&surface=Hard',
  '/players/M094?tab=matches&round=R32',
];

test.describe('No redirect checks', () => {
  for (const u of urls) {
    test(`no redirect for ${u}`, async ({ page, baseURL }) => {
      const full = baseURL + u;
      const response = await page.goto(full, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      expect(response!.status()).toBe(200);
      // ensure request was (or wasn't) redirected as expected
      const redirectedFrom = response!.request().redirectedFrom();
      const final = page.url();
      if (u.startsWith('/tournaments/')) {
        // tournaments intentionally redirect to canonical slug
        expect(redirectedFrom).not.toBeNull();
        expect(final).not.toBe(full);
      } else {
        // players/records/etc should not redirect
        expect(redirectedFrom).toBeNull();
        expect(final).toBe(full);
      }
    });
  }
});
