import React from 'react';
import CountFull from '../_components/CountFull';
import TournamentHeader from '../../../TournamentHeader';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';

function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return String(nameField);
  if (Array.isArray(nameField)) {
    for (const v of nameField) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  if (typeof nameField === 'object') {
    for (const v of Object.values(nameField)) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  return '';
}

function humanize(s: string) {
  return String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // default to a humanized version of the id (e.g., 'australian-open' -> 'Australian Open')
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  try {
    const header = await fetchTournamentHeaderCached(id);
    const raw = extractName(header?.name);
    if (raw) tournamentName = humanize(raw);
  } catch (e) {}

  // Use the exact phrasing requested for SEO title
  const title = `Most Wins At ${tournamentName}`;
  return { title };
}

export default async function WinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournamentName = await fetchTournamentHeaderCached(id).then((t: any) => {
    const raw = (t && t.name) ? (Array.isArray(t.name) ? (t.name.map((x: any) => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean).pop()) : t.name) : String(id).replace(/-/g, ' ');
    return String(raw).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }).catch(() => String(id).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

  return (
    <div className="w-full mx-auto p-8 text-white">
      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      <main>
        <h1 className="text-3xl font-extrabold mb-4">{`Most Wins At ${tournamentName}`}</h1>
        <CountFull id={id} section="wins" />
      </main>
    </div>
  );
}
