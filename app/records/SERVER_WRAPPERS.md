# Server wrappers for `app/records`

I added server-side wrapper components for the main record sections. These wrappers:

- Are Server Components (no `use client`).
- Accept the App Router `searchParams` object and extract common filters (`surface`, `level`, `round`, `bestOf`, `subtab`) while handling `[]` style query keys as well.
- Convert arrays to typed props expected by the existing client components (e.g. `selectedSurfaces: Set<string>`, `selectedBestOf: number | null`).
- Use the generic `components/ServerWrapper.tsx` to normalize and forward `searchParams` and `serverProps`.

Created wrappers (export default):

- `app/records/Ages/Ages.server.tsx`
- `app/records/AtAge/AtAge.server.tsx`
- `app/records/AgeofNth/AgeofNth.server.tsx`
- `app/records/H2H/H2H.server.tsx`
- `app/records/Timespan/Timespan.server.tsx`
- `app/records/Seasons/Seasons.server.tsx`
- `app/records/Same/Same.server.tsx`
- `app/records/RoundsOnEntries/RoundsOnEntries.server.tsx`
- `app/records/Sets/Sets.server.tsx`
- `app/records/Wins/Wins.server.tsx`
- `app/records/Titles/Titles.server.tsx`
- `app/records/CounterSeasons/CounterSeasons.server.tsx`
- `app/records/Count/Count.server.tsx`
- `app/records/Played/Played.server.tsx`
- `app/records/Entries/Entries.server.tsx`
- `app/records/Percentage/Percentage.server.tsx`
- `app/records/NeededTo/NeededTo.server.tsx`
- `app/records/FirstN/FirstN.server.tsx`

Usage
-----
If you have a Server Page that needs to render one of the record components with URL search params (for example when the URL is accessed directly), import the corresponding `*.server.tsx` wrapper and render it with the `searchParams` prop:

```tsx
import AgesServer from './Ages/Ages.server'

export default function Page({ searchParams }) {
  return <AgesServer searchParams={searchParams} />
}
```

Notes
-----
- The original client components are not modified and remain `use client`.
- Some components expect callback props (e.g. `Timespan` requires `onTabChange`); wrappers set reasonable defaults (no-op) or map prop names to match client props (e.g. `selectedTab` for `Timespan`). If you want richer interactions (e.g. tabs that update the URL), we can convert the parent page to a client component or add small client-only wrappers.

Next steps
----------
- I can update server pages to use these wrappers where appropriate (currently `app/records/[...slug]/page.tsx` uses the `ServerWrapper` for the filtered results).
- Optionally, convert `app/records/page.tsx` to a Server Component so it can render the server wrappers directly; this is a larger refactor and I can do it if you want.
