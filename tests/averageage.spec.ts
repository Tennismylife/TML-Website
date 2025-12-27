import { computeAverageChartData } from '../app/api/tournaments/[id]/records/averageage/route';
import { expect, it, describe } from 'vitest';

describe('computeAverageChartData', () => {
  it('splits same-year different tourney ids into 1977 and 1977-1 based on canonical', () => {
    const matches = [
      { year: 1977, tourney_id: '1977-580', winner_age: 25, loser_age: 27 },
      { year: 1977, tourney_id: '1977-581', winner_age: 22, loser_age: 24 },
    ];

    const { chartData, overallAverage } = computeAverageChartData(matches, '580');

    expect(chartData.length).toBe(2);
    expect(chartData[0].label).toBe('1977');
    expect(chartData[0].tourney_id).toBe('580');
    expect(chartData[0].averageAge).toBeCloseTo(26);

    expect(chartData[1].label).toBe('1977-2');
    expect(chartData[1].tourney_id).toBe('581');
    expect(chartData[1].averageAge).toBeCloseTo(23);

    expect(overallAverage).toBe('24.50');
  });
});