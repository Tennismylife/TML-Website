import React from 'react'

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
  serverProps?: Partial<CProps>
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
  // Spread normalized params so client components can accept them directly
  // (e.g. `surface`, `level`, `round`) while still receiving the raw
  // `searchParams` object under that prop name. Merge with any serverProps
  // supplied by the page.
  // Wrap the client component in a Suspense boundary to avoid forcing the
  // entire page to opt into client-side rendering when client hooks like
  // `useSearchParams` are used inside the client component (see Next.js message
  // "missing-suspense-with-csr-bailout"). This keeps the rest of the page
  // server-rendered and only hydrates the client component on the client.
  return (
    <React.Suspense fallback={<div className="text-gray-300">Loading…</div>}>
      <Component {...(normalized as unknown as CProps)} {...(serverProps as any)} searchParams={sp || {}} />
    </React.Suspense>
  )
}

