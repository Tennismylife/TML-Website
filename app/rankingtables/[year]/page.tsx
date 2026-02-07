import RankingTablesPage from '../page';

export default function Page({ params }: { params: { year: string } }) {
  // The client component `RankingTablesPage` reads the year from the URL on mount,
  // so simply rendering it here ensures `/rankingtables/:year` works.
  return <RankingTablesPage />;
}
