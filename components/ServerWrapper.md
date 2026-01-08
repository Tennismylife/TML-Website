# ServerWrapper (Server Component)

A generic server-side wrapper that renders any client component and passes URL search parameters to it.

## Behavior

- The component is a **Server Component** (no `use client` directive).
- It accepts any client component through the `Component` prop.
- It accepts App Router `searchParams` and passes them to the client component:
  - Normalizes keys ending with `[]` by stripping the brackets (e.g. `surface[]` -> `surface`) and merging repeated keys into arrays.
  - Spreads the normalized params as props (so the client can accept `surface`, `level`, `round`, etc directly) and also passes the original `searchParams` under the `searchParams` prop.

## TypeScript interfaces

- `ServerProvidedSearchParams`: `Record<string, string | string[] | undefined>` — the raw object from App Router
- `ServerToClientProps`: `{ searchParams: ServerProvidedSearchParams }` — always passed to client

## Example page

See `app/wrapper-demo/page.tsx` which renders `LatestMatchesClient` via the wrapper.

## Example URLs

- `/wrapper-demo?surface[]=clay&surface[]=grass&level[]=ATP&round=F&bestOf=3`
- `/wrapper-demo?level=ATP&round=QF`

When using keys with `[]`, the wrapper will normalize them to arrays and expose them as `surface`, `level`, etc.
