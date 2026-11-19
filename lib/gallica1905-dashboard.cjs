'use strict';

// Read-only, request-time projection of the existing Gallica 1905 AI corpus.
// Does not acquire claims, run the mining CLI, schedule jobs, or write to Gallica.
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT = '/home/andre/GallicaJobs/gallica-1905-all-tennis/GALlica_1905_ALL_TENNIS';
const AI = path.join(ROOT, '03_AUDIT', 'AI_ANALYSIS_1905');
const PUBLICATIONS = path.join(AI, 'claim_published');
const WORKERS = ['GALLICA1905_W1', 'GALLICA1905_W2', 'GALLICA1905_W3', 'GALLICA1905_W4', 'GALLICA1905_W5'];

function readTsv(file) {
  return parse(fs.readFileSync(file, 'utf8'), {
    columns: true, delimiter: '\t', bom: true,
    skip_empty_lines: true, relax_column_count: true
  });
}

function text(value, max = 10000) {
  return String(value == null ? '' : value)
    .replace(/\/(?:home\/andre|var\/www)\/[^\s"'<>]*/g, '[percorso VPS]')
    .slice(0, max);
}

function json(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isoMtime(file) {
  return fs.statSync(file).mtime.toISOString();
}

// Rank is the pre-AI source classification; coverage_state is the live review flag.
// Cache the static 5,253-page rank index until its source TSV changes.
const RANK_FILE = path.join(ROOT, '03_AUDIT', 'final_pre_ai_corpus_1905_event_mapped.tsv');
let rankIndex = { mtimeMs: -1, byPage: new Map() };
function pageRanks() {
  const mtimeMs = fs.statSync(RANK_FILE).mtimeMs;
  if (rankIndex.mtimeMs !== mtimeMs) {
    const next = new Map();
    for (const r of readTsv(RANK_FILE)) {
      const page = String(r.ark || '').trim() + '_f' + String(r.page || '').trim();
      const rank = String(r.rank || '').trim().toUpperCase();
      const queue = String(r.queue || '').trim().toLowerCase();
      const bucket = ['HIGH', 'MEDIUM', 'LOW'].includes(rank)
        ? rank : (queue === 'targeted_remaining' ? 'TARGETED' : rank === 'CONTINUITY' ? 'CONTINUITY' : 'OTHER');
      if (!next.has(page)) next.set(page, { bucket, triage: String(r.triage || '').trim().toUpperCase() });
    }
    rankIndex = { mtimeMs, byPage: next };
  }
  return rankIndex.byPage;
}

function latestPublications(limit) {
  if (!fs.existsSync(PUBLICATIONS)) return [];
  const byTime = [];
  for (const page of fs.readdirSync(PUBLICATIONS, { withFileTypes: true })) {
    if (!page.isDirectory() || !/^[a-z0-9_]+$/i.test(page.name)) continue;
    const pagePath = path.join(PUBLICATIONS, page.name);
    for (const claim of fs.readdirSync(pagePath, { withFileTypes: true })) {
      if (!claim.isDirectory() || !/^[a-f0-9]{32}$/.test(claim.name)) continue;
      const full = path.join(pagePath, claim.name, 'publish_manifest.json');
      try { byTime.push({ full, mtime: fs.statSync(full).mtimeMs }); }
      catch (_) { /* concurrently publishing; skip until next F5 */ }
    }
  }
  byTime.sort((a, b) => b.mtime - a.mtime);
  return byTime.slice(0, limit).map(({ full }) => {
    try {
      const d = json(full);
      const dir = path.dirname(full);
      const files = Array.isArray(d.files) ? d.files : [];
      const note = files.find(x => /^review_notes\/[^/]+\.md$/.test(String(x.path || '')));
      const handoff = files.find(x => /^worker_outputs\/[^/]+\.md$/.test(String(x.path || '')));
      let excerpt = '';
      for (const f of [note, handoff]) {
        if (!f) continue;
        try {
          const v = fs.readFileSync(path.join(dir, f.path), 'utf8');
          excerpt += (excerpt ? '\n\n' : '') + text(v, 8000);
        } catch (_) { /* optional note */ }
      }
      const csvs = files.filter(x => /^draw_mining\/[^/]+\.candidate\.csv$/.test(String(x.path || '')))
        .map(x => {
          let rows = 0;
          try {
            const data = fs.readFileSync(path.join(dir, x.path), 'utf8');
            rows = data.split(/\r?\n/).filter(Boolean).length;
          } catch (_) { /* optional candidate */ }
          return { rows };
        });
      return {
        at: text(d.published_at || isoMtime(full), 50),
        page: text(d.page_key, 90),
        worker: text(d.worker, 120),
        note: excerpt,
        candidateRowsOnPage: csvs.reduce((sum, f) => sum + f.rows, 0),
        gallica: /^[a-z0-9]+_f\d+$/i.test(String(d.page_key || ''))
          ? 'https://gallica.bnf.fr/ark:/12148/' + String(d.page_key).replace(/_f(\d+)$/, '/f$1.item')
          : null
      };
    } catch (_) { return null; }
  }).filter(Boolean);
}

function currentClaims() {
  const base = path.join(AI, 'coverage_claims');
  if (!fs.existsSync(base)) return [];
  const result = [];
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    if (!e.isDirectory() || !/^[a-z0-9_]+\.claim$/i.test(e.name)) continue;
    try {
      const v = json(path.join(base, e.name, 'claim_meta.json'));
      result.push({
        page: text(v.page_key || e.name.replace(/\.claim$/, ''), 90),
        worker: text(v.worker, 120),
        claimedAt: text(v.claimed_at, 60),
        progressAt: text(v.progress_at, 60),
        progress: text(v.progress, 500),
        heartbeatAt: text(v.heartbeat_at, 60),
        heartbeatSource: text(v.heartbeat_source, 60),
        verifiedEvents: text(v.verified_events, 550),
        status: text(v.status || 'CLAIMED', 30)
      });
    } catch (_) { /* atomic writer may be replacing file */ }
  }
  return result.sort((a, b) => String(b.claimedAt).localeCompare(String(a.claimedAt)));
}

function dashboardData() {
  const eventsPath = path.join(AI, 'ai_event_status.tsv');
  const registryPath = path.join(AI, 'full_draw_complete_registry.tsv');
  const coveragePath = path.join(AI, 'second_pass_coverage.tsv');
  const eventsRaw = readTsv(eventsPath);
  const registryRaw = readTsv(registryPath);
  const coverageRaw = readTsv(coveragePath);

  // Latest row per exact event label; aliases are deliberately NOT guessed/merged.
  const byName = new Map();
  for (const r of eventsRaw) {
    const name = String(r.event_name || '').trim();
    if (!name) continue;
    const prev = byName.get(name);
    if (!prev || String(r.updated_at || '') >= String(prev.updated_at || '')) byName.set(name, r);
  }
  const certified = registryRaw.map(r => ({
    id: text(r.tourney_id, 125),
    name: text(r.event_name, 300),
    matches: Number(r.matches) || 0,
    completedAt: text(r.completed_at, 60),
    gallica: /^[a-z0-9]+_f\d+$/i.test(String(r.source_page || ''))
      ? 'https://gallica.bnf.fr/ark:/12148/' + String(r.source_page).replace(/_f(\d+)$/, '/f$1.item')
      : null
  }));
  const normalizedCertified = new Set(certified.map(x => x.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()));
  const events = [...byName.values()].map(r => {
    const exhaustion = Number(r.resource_exhaustion);
    const matching = Number(r.resource_matching);
    const name = text(r.event_name, 300);
    const normalized = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return {
      name, key: text(r.event_key, 140),
      dateWindow: text(r.date_window, 110),
      classification: text(r.classification, 220),
      master: text(r.master_status, 1300),
      exhaustion: Number.isFinite(exhaustion) ? Math.max(0, Math.min(100, exhaustion)) : null,
      resourceMatching: Number.isFinite(matching) ? Math.max(0, Math.min(100, matching)) : null,
      matches: text(r.matches_confirmed, 1000),
      playersNew: text(r.players_new, 140),
      sources: text(r.primary_sources, 2400),
      status: text(r.status, 260),
      next: text(r.next_action, 4500),
      updatedAt: text(r.updated_at, 70),
      certified: normalizedCertified.has(normalized)
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'it'));

  const state = { pending: 0, reviewed: 0, claimed: 0, mapped: 0, unmapped: 0 };
  const ranks = pageRanks();
  const priorities = Object.fromEntries(['HIGH', 'MEDIUM', 'LOW', 'TARGETED', 'CONTINUITY', 'OTHER'].map(rank => [
    rank, { rank, total: 0, reviewed: 0, pending: 0, claimed: 0, mapped: 0, triage: {} }
  ]));
  for (const r of coverageRaw) {
    const s = String(r.coverage_state || '').toUpperCase();
    const origin = ranks.get(String(r.page_key || '')) || { bucket: 'OTHER', triage: 'UNKNOWN' };
    const item = priorities[origin.bucket] || priorities.OTHER;
    item.total++;
    const triage = origin.triage || 'UNKNOWN';
    item.triage[triage] = (item.triage[triage] || 0) + 1;
    if (s === 'PENDING') { state.pending++; item.pending++; }
    else if (s === 'REVIEWED') { state.reviewed++; item.reviewed++; }
    else if (s === 'CLAIMED') { state.claimed++; item.claimed++; }
    if (String(r.MAPPED) === '1') { state.mapped++; item.mapped++; }
    else state.unmapped++;
  }
  const claims = currentClaims();
  const publications = latestPublications(65);
  const workers = WORKERS.map(id => {
    const ownPublications = publications.filter(p => p.worker === id);
    return {
      id, claims: claims.filter(c => c.worker === id),
      lastPublication: ownPublications.length ? ownPublications[0] : null
    };
  });
  return {
    updatedAt: new Date().toISOString(),
    filesUpdatedAt: {
      events: isoMtime(eventsPath), coverage: isoMtime(coveragePath), registry: isoMtime(registryPath)
    },
    summary: {
      eventRows: eventsRaw.length,
      distinctEventLabels: events.length,
      certifiedDraws: certified.length,
      certifiedMatches: certified.reduce((sum, v) => sum + v.matches, 0),
      pageCount: coverageRaw.length,
      ...state,
      openClaimDirectories: claims.length
    },
    priorities: ['HIGH', 'MEDIUM', 'LOW', 'TARGETED', 'CONTINUITY', 'OTHER'].map(rank => priorities[rank]).filter(item => item.total > 0),
    certified, events, workers, publications
  };
}

module.exports = { dashboardData };
