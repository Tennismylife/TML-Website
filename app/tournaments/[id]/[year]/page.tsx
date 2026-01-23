import TournamentEditionClient from './EditionClient';
import { buildTournamentJsonLdFromDb, fetchEditionInfo, getEditionValue } from './layout';
import Breadcrumbs from './Breadcrumbs';
import { prisma } from '@/lib/prisma';

// Local helpers
function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const v = value[i];
      if (v) return firstString(v);
    }
    return '';
  }
  if (typeof value === 'object') {
    const vals = Object.values(value);
    for (const v of vals) {
      if (v) return firstString(v);
    }
    return '';
  }
  return '';
}

// Server component: render client edition component and inject JSON-LD from DB
export default async function Page(props: any) {
  // Resolve params (Next may pass params as a Promise)
  const resolvedParams = props?.params instanceof Promise ? await props.params : props?.params;
  const id = resolvedParams?.id ?? '';
  const year = resolvedParams?.year ?? '';

  // Centralized existence check: call shared helper and render a friendly
  // server-side fallback instead of throwing a 404. This prevents the "ghost
  // 404" UX caused by transient errors or missing DB rows.
  // eslint-disable-next-line no-console
  console.info('Rendering Tournament page', { id, year });
  let editionInfo: any = null;
  let editionMissing = false;
  try {
    editionInfo = await fetchEditionInfo({ id, year });
    // eslint-disable-next-line no-console
    console.info('fetchEditionInfo result', { id, year, hasInfo: !!editionInfo, hasMatches: editionInfo?.hasMatches });
    if (!editionInfo) editionMissing = true;
  } catch (e) {
    // Log unexpected errors but do NOT treat them as a hard 404. Show a friendly
    // fallback UI so users don't see the framework's 404 boundary.
    // eslint-disable-next-line no-console
    console.error('fetchEditionInfo failed in page.tsx', { id, year, e });
    editionMissing = true;
  }

  if (editionMissing) {
    // eslint-disable-next-line no-console
    console.warn('Rendering tournament fallback (editionMissing)', { id, year });
    return (
      <main className="w-full px-6 py-8 text-center">
        <h1 className="text-3xl font-extrabold mb-4">Tournament edition unavailable</h1>
        <p className="mb-4">We couldn't find that tournament edition or the data is temporarily unavailable.</p>
        <p className="mb-6">You can <a href="/tournaments" className="text-blue-400 hover:underline">browse all tournaments</a>.</p>
        {/* SEO-only link: visually hidden for users, present in the DOM for crawlers */}
        <a href={`/tournaments/${id}/${year}/records`} className="sr-only">View Records of the Tournament</a>
      </main>
    );
  }

  let jsonLd = '';
  try {
    if (id && year) {
      jsonLd = await buildTournamentJsonLdFromDb({ id, year });
    }
  } catch (e) {
    // JSON-LD generation failed; continue without it
    jsonLd = '';
  }

  // Ensure SportsEvent startDate aligns with edition official date.
  // Strategy: prefer edition-specific startDate from the tournament row, then
  // prefer the final match date from the DB, finally fallback to `${year}-01-01`.
  let officialStartDate: string | null = null;
  const yearNum = Number(year);
  try {
    // 1) Try tournament edition-level startDate from fetchEditionInfo
    if (editionInfo?.tourneyRow) {
      const editionStart = getEditionValue(editionInfo.tourneyRow.startDate, yearNum);
      if (editionStart) {
        try {
          officialStartDate = new Date(editionStart).toISOString().split('T')[0];
        } catch {
          officialStartDate = String(editionStart);
        }
      }
    }

    // 2) If still missing, attempt to get final match date from the DB using tourneyIds
    if (!officialStartDate && editionInfo?.tourneyIds && Array.isArray(editionInfo.tourneyIds) && editionInfo.tourneyIds.length) {
      try {
        const tourneyIdFilters = editionInfo.tourneyIds.flatMap((tid: string) => [ { tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } } ]);
        const finalMatch: any = await prisma.match.findFirst({ where: { AND: [ { OR: tourneyIdFilters }, { year: yearNum }, { round: 'F' } ] }, orderBy: { id: 'desc' } });
        if (finalMatch?.tourney_date) {
          officialStartDate = new Date(finalMatch.tourney_date).toISOString().split('T')[0];
        } else {
          // If no final yet (future edition), try earliest match date in the edition (first scheduled match)
          try {
            const earliestMatch: any = await prisma.match.findFirst({ where: { AND: [ { OR: tourneyIdFilters }, { year: yearNum } ] }, orderBy: { tourney_date: 'asc' } });
            if (earliestMatch?.tourney_date) {
              officialStartDate = new Date(earliestMatch.tourney_date).toISOString().split('T')[0];
            }
          } catch {}
        }
      } catch (e) {
        // Ignore DB errors here; we'll fallback below
      }
    }
  } catch (e) {
    // Any unexpected errors should not bubble up; we'll fallback to default below
    officialStartDate = null;
  }

  // 3) Final fallback
  if (!officialStartDate) {
    officialStartDate = `${String(yearNum)}-01-01`;
  }

  // If we already have a jsonLd SportsEvent script, ensure its startDate matches
  if (jsonLd && officialStartDate) {
    try {
      jsonLd = jsonLd.replace(/("startDate"\s*:\s*")([^\"]+)(")/i, `$1${officialStartDate}$3`);
    } catch (e) {
      // Non-fatal; keep original jsonLd if replacement fails
    }
  }

  // When jsonLd is missing, build a minimal SportsEvent JSON-LD ensuring startDate is present
  let sportsEventScript = '';
  if (!jsonLd) {
    const tournamentName = editionInfo?.tourneyRow ? firstString(editionInfo.tourneyRow.name) : humanizeName(id);
    const surface = editionInfo?.tourneyRow ? firstString(editionInfo.tourneyRow.surfaces ?? '') : '';
    const city = editionInfo?.tourneyRow ? getEditionValue(editionInfo.tourneyRow.city, yearNum) : undefined;
    const country = editionInfo?.tourneyRow ? getEditionValue(editionInfo.tourneyRow.country, yearNum) : undefined;

    const event: any = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      sport: 'Tennis',
      name: [tournamentName, year].filter(Boolean).join(' '),
      startDate: officialStartDate,
    };
    if (surface) event.description = `Surface: ${surface}`;
    if (city || country) {
      event.location = { '@type': 'Place', address: { '@type': 'PostalAddress', ...(city ? { addressLocality: city } : {}), ...(country ? { addressCountry: country } : {}) } };
    }

    sportsEventScript = `<script type="application/ld+json">${JSON.stringify(event)}</script>`;
  }

  const slug = editionInfo?.tourneyRow?.slug ?? id;

  // Tournament display name (per requirement `data.tournamentName` semantics)
  const tournamentName = editionInfo?.tourneyRow ? firstString(editionInfo.tourneyRow.name) : humanizeName(id);

  // Build canonical items as requested (hub always exists)
  const items = [
    { name: 'Home', href: '/' },
    { name: 'Tournaments', href: '/tournaments' },
    { name: tournamentName, href: `/tournaments/${id}` },
    { name: String(year), current: true },
  ];

  // JSON-LD BreadcrumbList (SSR) — single script in the page
  const SITE = 'https://stats.tennismylife.org';
  const breadcrumbListJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${SITE}/tournaments` },
      { '@type': 'ListItem', position: 3, name: tournamentName, item: `${SITE}/tournaments/${id}` },
      { '@type': 'ListItem', position: 4, name: String(year), item: `${SITE}/tournaments/${id}/${year}` },
    ],
  };

  return (
    <>
      {jsonLd ? (
        <div dangerouslySetInnerHTML={{ __html: jsonLd }} />
      ) : sportsEventScript ? (
        <div dangerouslySetInnerHTML={{ __html: sportsEventScript }} />
      ) : null}

      {/* Breadcrumbs (server component) */}
      <Breadcrumbs items={items} />
      {/* JSON-LD BreadcrumbList (SSR) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJson) }} />

      {/* SEO-only link: visually hidden for users, present in the DOM for crawlers */}
      <a href={`/tournaments/${id}/${year}/records`} className="sr-only">View Records of the Tournament</a>

      <TournamentEditionClient {...props} />
    </>
  );
}
