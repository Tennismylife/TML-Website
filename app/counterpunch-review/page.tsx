import { TourAnchor } from "@/components/TourLink";
import type { Metadata } from 'next';
import { readFile, readdir, stat } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import RefreshControl from './RefreshControl';
import styles from './dashboard.module.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: 'CounterPunch V46 · Progress Dashboard',
  description: 'TennisMyLife internal read-only audit progress',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const ROOT = '/var/www/TML-Website/.tml-audits';
type AnyRow = Record<string, string>;
type Task = { id: string; name: string; priority: string; status: string; scope: string; next: string };
type Plan = {
  created_date: string;
  live_reference: { global_source_statistic_cells: number };
  tasks: Task[];
};
type Receipt = { cycle?: number; status?: string; cells_changed?: number; matches_changed?: number; V46_matched?: number; V46_held?: number };
const readJson = async <T,>(filename: string): Promise<T> => JSON.parse(await readFile(ROOT + '/' + filename, 'utf8')) as T;
const readCsv = async (filename: string): Promise<AnyRow[]> => parse(await readFile(ROOT + '/' + filename, 'utf8'), { columns: true, skip_empty_lines: true, bom: true }) as AnyRow[];
const fmt = (n: number) => new Intl.NumberFormat('it-IT').format(n);
const pct = (n: number, total: number) => total > 0 ? (100 * n / total).toFixed(1) + '%' : '—';
const labelStatus = (status: string) => {
  if (status.includes('CLOSED') || status.includes('VERIFIED_CURRENT')) return 'Confermato';
  if (status.includes('PARTIAL') || status.includes('SOURCE_CONFLICT')) return 'Da risolvere';
  if (status.includes('RESTRICTED') || status.includes('SOURCE_REVIEW')) return 'Verifica fonti';
  return 'In analisi';
};
const statusClass = (status: string) => status.includes('CLOSED') || status.includes('VERIFIED_CURRENT') ? 'bg-lime-400/10 border-lime-400/40' : status.includes('PARTIAL') || status.includes('CONFLICT') ? 'bg-amber-400/10 border-amber-400/40' : 'bg-sky-400/10 border-sky-400/30';

async function getReport() {
  const [plan, proposals, matches, candidates, dir] = await Promise.all([
    readJson<Plan>('COUNTERPUNCH_V46_GLOBAL_CONTROL_CURRENT.json'),
    readCsv('COUNTERPUNCH_V46_WTA2015_LIVE_QUEUE.csv'),
    readCsv('../data/2015_wta.csv'),
    readCsv('COUNTERPUNCH_V46_ATP_458_REPEATED_STAT_CANDIDATES_20261026.csv'),
    readdir(ROOT),
  ]);
  const key = (x: AnyRow) => x.tourney_id + ':' + x.match_num;
  const index = new Map(matches.map(x => [key(x), x]));
  const total = proposals.length;
  let applied = 0, pending = 0, rejected = 0, hold = 0;
  for (const p of proposals) {
    if (p.status === 'REJECTED_INDEPENDENT_SOURCE_CONFIRMS_MASTER') { rejected++; continue; }
    if (p.status === 'UNCHANGED_NEEDS_DIRECT_SOURCE') { hold++; continue; }
    if (p.status === 'CONFIRMED_ALREADY_NEW') {
      if (index.get(key(p))?.[p.field] === p.current) applied++;
      else pending++;
    }
  }
  const receiptFiles = dir.filter(n => /^COUNTERPUNCH_CYCLE\d+_CLOSED_SUMMARY_/.test(n) && n.endsWith('.json'))
    .sort((a, b) => Number((b.match(/CYCLE(\d+)/) || [,'0'])[1]) - Number((a.match(/CYCLE(\d+)/) || [,'0'])[1])).slice(0, 8);
  const recent = await Promise.all(receiptFiles.map(async filename => {
    try { return await readJson<Receipt>(filename); } catch { return null; }
  }));
  const audit = await stat(ROOT + '/COUNTERPUNCH_V46_WTA2015_LIVE_QUEUE.csv');
  return {
    plan, total, applied, pending, rejected, hold,
    candidates: candidates.length,
    atpGroups: new Set(candidates.map(x => x.group_id)).size,
    atpInconsistent: candidates.filter(x => x.service_games_exceed_score_games === 'True').length,
    recent: recent.filter((x): x is Receipt => x !== null),
    latestClosed: recent.find(x => x?.cycle)?.cycle ?? null,
    updated: audit.mtime.toISOString(),
  };
}

export default async function CounterPunchDashboard() {
  let data: Awaited<ReturnType<typeof getReport>>;
  try {
    data = await getReport();
  } catch {
    return <div className={styles.page}>
      <section className={styles.panel}>
        <h1 className="text-2xl font-extrabold mb-3">CounterPunch V46</h1>
        <p>Registri di revisione temporaneamente non disponibili. Nessun avanzamento viene stimato.</p>
        <RefreshControl />
      </section>
    </div>;
  }
  const { total, applied, pending, rejected, hold, candidates, atpGroups, atpInconsistent, recent, latestClosed, plan } = data;
  const done = applied + rejected;
  const pctValue = (n: number) => total ? 100 * n / total + '%' : '0%';
  const updated = new Intl.DateTimeFormat('it-IT', {timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'medium'}).format(new Date(data.updated));
  const tasks = [...plan.tasks].sort((a,b) => Number(a.priority.slice(1)) - Number(b.priority.slice(1)));

  return <div className={styles.page}>
    <div className="flex items-center justify-between gap-4 mb-5 text-xs">
      <div className="flex gap-3 items-center"><strong className="bg-lime-300 rounded px-2 py-1 !text-slate-950">TML</strong><span className="uppercase tracking-[.2em] font-extrabold">Audit control / V46</span></div>
      <TourAnchor href="/" className="!text-slate-300 hover:!text-lime-200">Torna al sito</TourAnchor>
    </div>
    <section className={styles.hero}>
      <div className="flex flex-wrap justify-between items-start gap-6">
        <div>
          <div className={styles.kicker}>● LIVE · CONTROL CENTER</div>
          <h1 className={styles.heading}>CounterPunch <span className="!text-lime-300">V46</span></h1>
          <p className={styles.intro}>Stato di conciliazione dei dati TennisMyLife. Conteggi derivati dalla coda V46, dal master WTA 2015 e dai registri di verifica presenti sulla VPS. Nessun dato è modificabile da questa pagina.</p>
        </div>
        <div className="text-right">
          <span className="text-xs !text-slate-300 border border-slate-600 px-3 py-2 rounded-full">Lettura diretta dai registri</span>
          <div className="mt-3"><RefreshControl /></div>
        </div>
      </div>
    </section>

    <section aria-label="Indicatori principali" className={styles.metricGrid}>
      <div className={styles.metric}><div className={styles.metricName}>Proposte statistiche V46</div><div className={styles.metricValue}>{fmt(plan.live_reference.global_source_statistic_cells)}</div><div className={styles.metricSub}>Totale pacchetto · tre dataset</div></div>
      <div className={styles.metric}><div className={styles.metricName}>WTA 2015 · esiti definitivi</div><div className={styles.metricValue + ' ' + styles.limeMetric}>{fmt(done)} <small className="text-sm font-normal !text-slate-300">/ {fmt(total)}</small></div><div className={styles.metricSub}>{pct(done,total)} · applicate o respinte</div></div>
      <div className={styles.metric}><div className={styles.metricName}>WTA 2015 · HOLD</div><div className={styles.metricValue + ' ' + styles.amberMetric}>{fmt(hold)}</div><div className={styles.metricSub}>Restano da verificare con fonti</div></div>
      <div className={styles.metric}><div className={styles.metricName}>ATP · vettori duplicati</div><div className={styles.metricValue}>{fmt(candidates)}</div><div className={styles.metricSub}>{fmt(atpGroups)} gruppi · {fmt(atpInconsistent)} anomalie aggiuntive</div></div>
    </section>

    <div className={styles.blockGrid}>
      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>WTA 2015 · avanzamento verificato</h2>
        <p className={styles.sectionSub}>La percentuale non considera conclusi i valori presenti nella coda ma ancora assenti nel master.</p>
        <div className="flex items-end gap-3"><div className={styles.bigNum}>{pct(done,total)}</div><span className="text-xs !text-slate-300 mb-2">{done} / {total} con esito definitivo</span></div>
        <div className={styles.track} aria-label="Progressione delle proposte WTA 2015">
          <div className={styles.progressDone} style={{width:pctValue(applied)}} title={'Applicate: '+applied}/>
          <div className={styles.progressRejected} style={{width:pctValue(rejected)}} title={'Respinte: '+rejected}/>
          <div className={styles.progressWaitingWrite} style={{width:pctValue(pending)}} title={'Confermate non applicate: '+pending}/>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendRow}><span className="inline-block w-2 h-2 bg-lime-300 rounded-sm mr-2"/>{fmt(applied)} applicate</div>
          <div className={styles.legendRow}><span className="inline-block w-2 h-2 bg-slate-400 rounded-sm mr-2"/>{fmt(rejected)} respinte</div>
          <div className={styles.legendRow}><span className="inline-block w-2 h-2 bg-amber-300 rounded-sm mr-2"/>{fmt(pending)} confermate, non applicate</div>
          <div className={styles.legendRow}><span className="inline-block w-2 h-2 bg-slate-600 rounded-sm mr-2"/>{fmt(hold)} in attesa di fonti</div>
        </div>
        {pending > 0 ? <div className={styles.infoAlert}>
          <strong>Coda con scritture ancora da verificare</strong>
          <p>{pending} celle risultano confermate nella coda ma non corrispondono ancora al master. L’ultimo ciclo completamente chiuso è C{latestClosed ?? '—'}.</p>
        </div> : <div className={styles.infoAlert + ' ' + styles.infoGood}>
          <strong>Coda allineata al master</strong><p>Nessuna proposta confermata risulta in attesa di scrittura. Ultimo ciclo chiuso: C{latestClosed ?? '—'}.</p>
        </div>}
      </section>
      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>ATP storico · verifica duplicati</h2>
        <p className={styles.sectionSub}>I vettori identici sono indizi, non automaticamente statistiche errate.</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl bg-slate-800/70 p-4"><div className="text-3xl font-bold !text-white">{fmt(atpGroups)}</div><div className="text-xs !text-slate-300">gruppi di vettori</div></div>
          <div className="rounded-xl bg-slate-800/70 p-4"><div className="text-3xl font-bold !text-amber-200">{fmt(atpInconsistent)}</div><div className="text-xs !text-slate-300">contraddizioni giochi</div></div>
        </div>
        <div className="text-xs !text-slate-300 leading-7">
          <div className="flex justify-between border-b border-slate-700 py-2"><span>Intervallo anni</span><strong>1991–2018</strong></div>
          <div className="flex justify-between border-b border-slate-700 py-2"><span>Tour</span><strong>ATP</strong></div>
          <div className="flex justify-between border-b border-slate-700 py-2"><span>Shanghai 2025</span><strong className="!text-lime-300">16 celle già corrette</strong></div>
          <div className="flex justify-between py-2"><span>Avanzamento di questa indagine</span><strong>Da classificare</strong></div>
        </div>
        <div className="mt-3 text-xs !text-slate-400 leading-6">Priorità ai casi in cui i giochi al servizio registrati superano i giochi effettivamente disputati.</div>
      </section>
    </div>

    <section className="mt-7"><h2 className="text-xl font-bold mb-4">Registro dei filoni ({tasks.length})</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map(t => <article key={t.id} className="rounded-xl bg-[#172638] border border-slate-700 p-5"><div className="flex gap-2 items-center mb-3"><span className="text-xs font-bold !text-lime-200">{t.priority}</span><span className="text-[10px] !text-slate-400">{t.id}</span></div><h3 className="text-base font-bold !text-white">{t.name}</h3><p className="text-xs !text-slate-300 leading-6">{t.next}</p><span className={'inline-block mt-3 border rounded-lg px-3 py-2 text-xs ' + statusClass(t.status)}>{labelStatus(t.status)}</span></article>)}
    </div></section>
  </div>;
}
