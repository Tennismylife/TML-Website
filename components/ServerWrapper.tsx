import React from 'react'
import WtaRecordNarrative, { eligibleWtaNarrativeRows, hasWtaNarrative, wtaRecordItems, type WtaNarrativeSpec } from '@/app/records/WtaRecordNarrative'
import RecordsItemListJsonLd from '@/app/records/RecordsJsonLd'
import { RecordCommentaryProvider } from '@/app/records/AtpRecordCommentary'
import { getWtaNarrativeEvidence } from '@/app/records/wta-narrative-evidence'

/**
 * Generic interface that represents the search params object provided
 * by Next.js App Router: keys map to string | string[] | undefined.
 */
export interface ServerProvidedSearchParams {
  [key: string]: string | string[] | undefined
}

/**
 * Props that the server wrapper will always pass to the client component.
 * - `searchParams`: the raw object received from Next.js
 */
export interface ServerToClientProps {
  searchParams: ServerProvidedSearchParams
}

type ServerWrapperProps<CProps> = {
  Component: React.ComponentType<CProps & ServerToClientProps>
  searchParams: ServerProvidedSearchParams
  /**
   * Optional extra props supplied by the server page (useful to forward
   * route params such as `record` or computed values like `canonicalUrl`).
   */
  serverProps?: Partial<CProps> & { wtaNarrative?: WtaNarrativeSpec }
}

function narrativeRows(props: Record<string, unknown>, spec: WtaNarrativeSpec): unknown[] {
  const direct = [props.topWinners, props.topPlayed, props.topTitles, props.topEntries, props.topCount, props.topWinPercentages];
  const rows = direct.find((value): value is unknown[] => Array.isArray(value));
  if (rows) return rows;

  const groups = props.prefetchedData as Record<string, unknown> | undefined;
  if (!groups) return [];
  const sub = String(props.activeSubTab ?? props.selectedTab ?? spec.sub ?? '');
  const key = sub === 'round' ? 'rounds' : sub === 'rounds' ? 'round' : sub;
  const primary = groups[sub];
  const alternate = groups[key];
  if (Array.isArray(primary)) return primary;
  if (Array.isArray(alternate)) return alternate;
  const populated = Object.values(groups).filter((value): value is unknown[] => Array.isArray(value));
  return populated.length === 1 ? populated[0] : [];
}

/**
 * Normalize keys that end with `[]` (e.g. `surface[]`) by stripping the
 * brackets and merging repeated keys into arrays. This makes it convenient
 * for client components to receive `surface: string[]` instead of
 * `"surface[]": string[]`.
 */
function normalizeSearchParams(sp: ServerProvidedSearchParams): ServerProvidedSearchParams {
  const out: ServerProvidedSearchParams = {}
  for (const [k, v] of Object.entries(sp)) {
    const key = k.endsWith('[]') ? k.slice(0, -2) : k
    if (v === undefined) continue
    if (out[key] === undefined) {
      out[key] = v
    } else {
      const prev = out[key]
      const toArray = (x: string | string[]) => (Array.isArray(x) ? x : [x])
      out[key] = [...toArray(prev as any), ...toArray(v as any)]
    }
  }
  return out
}

/**
 * Server-side wrapper Server Component
 * - Renders any client component passed via `Component`
 * - Passes normalized search params (spread) and the raw `searchParams` prop
 * - `serverProps` can be used to forward route params or calculated values
 *
 * Example usage in an App Router page:
 *
 * export default function Page({ searchParams }) {
 *   return <ServerWrapper Component={MyClient} searchParams={searchParams} serverProps={{ record, canonicalUrl }} />
 * }
 */
export default async function ServerWrapper<CProps>({ Component, searchParams, serverProps }: ServerWrapperProps<CProps>) {
  const sp = (searchParams && typeof (searchParams as any).then === 'function') ? await (searchParams as any) : searchParams
  const normalized = normalizeSearchParams(sp || {})
  const { wtaNarrative, ...clientProps } = serverProps ?? {}
  const recordProps = clientProps as Record<string, unknown>
  const spec = wtaNarrative && hasWtaNarrative(wtaNarrative) ? wtaNarrative : undefined
  const rows = wtaNarrative ? narrativeRows(recordProps, wtaNarrative) : []
  const evidence = spec && rows.length ? await getWtaNarrativeEvidence(spec, eligibleWtaNarrativeRows(rows, spec), recordProps) : []
  // Spread normalized params so client components can accept them directly
  // (e.g. `surface`, `level`, `round`) while still receiving the raw
  // `searchParams` object under that prop name. Merge with any serverProps
  // supplied by the page.
  //
  // We intentionally avoid wrapping the record tree in Suspense here so the
  // HTML for narratives and tables is emitted inline in the initial response
  // instead of being relegated to a streamed fallback boundary.
  return <>
    {wtaNarrative && <RecordsItemListJsonLd name={wtaNarrative.heading} items={wtaRecordItems(rows, wtaNarrative)} />}
    {spec ? (
      <RecordCommentaryProvider path={spec.sourcePath} body={<WtaRecordNarrative spec={spec} rows={rows} evidence={evidence} />}>
        <Component {...(normalized as unknown as CProps)} {...(clientProps as any)} searchParams={sp || {}} />
      </RecordCommentaryProvider>
    ) : (
      <Component {...(normalized as unknown as CProps)} {...(clientProps as any)} searchParams={sp || {}} />
    )}
  </>
}
