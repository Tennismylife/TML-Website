const jiti = require('jiti')(__filename);

async function runScenario(name, mocks) {
  console.log(`\n--- Scenario: ${name} ---`);

  // Use the pure util directly to validate mapping logic for the provided mocks.
  const util = jiti('../app/api/recordsranking/mostpoints/overall/utils.ts');
  try {
    const body = util.buildMostPointsResult(mocks.grouped, mocks.candidates, mocks.players);
    console.log('Response:', JSON.stringify(body, null, 2));
  } catch (e) {
    console.error('Error calling util:', e);
  } finally {
    // no external state to restore when using pure util
  }
}

(async function () {
  // Scenario A: ranking rows include player
  await runScenario('ranking row has player', {
    grouped: [{ playerId: 'p1', _max: { points: 500 } }],
    candidates: [
      { playerId: 'p1', points: 500, rankingDate: { date: new Date('2020-01-01') }, player: { atpname: 'N. Player', ioc: 'USA' } },
    ],
    players: [],
  });

  // Scenario B: ranking row missing player, but players table has info
  await runScenario('missing player on ranking row; fallback to players table', {
    grouped: [{ playerId: 'p2', _max: { points: 420 } }],
    candidates: [
      { playerId: 'p2', points: 420, rankingDate: { date: new Date('2021-06-15') }, player: null },
    ],
    players: [{ id: 'p2', atpname: 'Fallback Player', ioc: 'FRA' }],
  });

  // Scenario C: missing everywhere -> expect Player <id>
  // For simplicity this scenario uses the pure util directly below (no need to call route)
  const util = jiti('../app/api/recordsranking/mostpoints/overall/utils.ts');
  const resC = util.buildMostPointsResult(
    [{ playerId: 'p3', _max: { points: 300 } }],
    [{ playerId: 'p3', points: 300, rankingDate: null, player: null }],
    []
  );
  console.log('\n--- Scenario: missing everywhere ---');
  console.log('Response:', JSON.stringify(resC, null, 2));
})();
