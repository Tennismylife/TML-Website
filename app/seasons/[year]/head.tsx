export default function Head({ params }: { params: { year: string } }) {
  const { year } = params;
  const title = `${year} ATP Tennis Season | Matches, Results & Rankings`;
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={`Matches, results, and rankings for the ${year} ATP season.`} />
    </>
  );
}
