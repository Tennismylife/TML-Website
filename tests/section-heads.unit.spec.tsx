/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';

import { metadata as RecordsMetadata } from '../app/records/layout';
import { metadata as RankingMetadata } from '../app/ranking/layout';
import { metadata as RankingTablesMetadata } from '../app/rankingtables/layout';
import { metadata as PlayersMetadata } from '../app/players/layout';
import { metadata as MatchesMetadata } from '../app/matches/layout';
import { metadata as ForecastsMetadata } from '../app/forecasts/layout';
import { metadata as H2HMetadata } from '../app/h2h/layout';
import { metadata as RecordsRankingMetadata } from '../app/recordsRanking/layout';
import { metadata as SeasonsMetadata } from '../app/seasons/layout';
import { metadata as StatisticsMetadata } from '../app/statistics/layout';
import { metadata as TournamentsMetadata } from '../app/tournaments/layout';
import { metadata as PvpMetadata } from '../app/player-vs-player/layout';

const cases: Array<{ metadata: any; path: string }> = [
  { metadata: RecordsMetadata, path: '/records' },
  { metadata: RankingMetadata, path: '/ranking' },
  { metadata: RankingTablesMetadata, path: '/rankingtables' },
  { metadata: PlayersMetadata, path: '/players' },
  { metadata: MatchesMetadata, path: '/matches' },
  { metadata: ForecastsMetadata, path: '/forecasts' },
  { metadata: H2HMetadata, path: '/h2h' },
  { metadata: RecordsRankingMetadata, path: '/recordsRanking' },
  { metadata: SeasonsMetadata, path: '/seasons' },
  { metadata: StatisticsMetadata, path: '/statistics' },
  { metadata: TournamentsMetadata, path: '/tournaments' },
  { metadata: PvpMetadata, path: '/player-vs-player' },
];

describe('Section metadata exports', () => {
  for (const { metadata, path } of cases) {
    it(`provides metadata for ${path}`, () => {
      expect(metadata).toBeTruthy();
      if (metadata.alternates && metadata.alternates.canonical) {
        expect(metadata.alternates.canonical).toContain(path);
      } else if (metadata.openGraph && metadata.openGraph.url) {
        expect(metadata.openGraph.url).toContain(path);
      }
    });
  }
});
