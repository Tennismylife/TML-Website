export function computeAverageChartData(matches: any[], canonicalParam?: string | null) {
  // Group by year AND by original numeric tourney id (extract last segment)
  const yearMap = new Map<number, Map<string, number[]>>();

  for (const match of matches) {
    const year = match.year;
    if (!year) continue;
    const rawTourney = String(match.tourney_id ?? '');
    const parts = rawTourney.split('-');
    const origNumericTourney = parts[parts.length - 1] || '0';

    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const inner = yearMap.get(year)!;
    if (!inner.has(origNumericTourney)) inner.set(origNumericTourney, []);
    if (match.winner_age) inner.get(origNumericTourney)!.push(match.winner_age);
    if (match.loser_age) inner.get(origNumericTourney)!.push(match.loser_age);
  }

  const chartData: Array<{ label: string; averageAge: number; year: number; tourney_id?: string }> = [];
  const allAges: number[] = [];

  for (const [year, inner] of Array.from(yearMap.entries()).sort((a, b) => a[0] - b[0])) {
    // order groups: put canonical first if present, then others sorted numerically
    const groups = Array.from(inner.keys()).sort((a, b) => Number(a) - Number(b));
    if (canonicalParam && groups.includes(String(canonicalParam))) {
      groups.splice(groups.indexOf(String(canonicalParam)), 1);
      groups.unshift(String(canonicalParam));
    }

    for (let i = 0; i < groups.length; i++) {
      const gid = groups[i];
      const ages = inner.get(gid)!;
      if (!ages.length) continue;
      const avg = ages.reduce((s, v) => s + v, 0) / ages.length;
      allAges.push(...ages);
      const label = i === 0 ? String(year) : `${year}-${i + 1}`; // primary group gets '1977', others '1977-2', '1977-3'...
      chartData.push({ label, averageAge: avg, year, tourney_id: gid });
    }
  }

  const overallAverage = allAges.length ? (allAges.reduce((sum, age) => sum + age, 0) / allAges.length).toFixed(2) : '0.00';

  return { chartData, overallAverage };
}
