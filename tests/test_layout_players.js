// test_player_stats.js
// Node 18+ required

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const PLAYER_ID = 'N409';

async function testPlayerStats() {
  try {
    const res = await fetch(`${SITE_URL}/api/players/allmatches?id=${PLAYER_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const allMatches = await res.json();
    const matches = allMatches.filter(m => m.status !== false);

    const totalMatches = matches.length;
    const careerWins = matches.filter(m => m.winner_id === PLAYER_ID).length;
    const careerLosses = totalMatches - careerWins;

    const clayWins = matches.filter(m => m.winner_id === PLAYER_ID && m.surface === 'Clay').length;
    const hardWins = matches.filter(m => m.winner_id === PLAYER_ID && m.surface === 'Hard').length;
    const grassWins = matches.filter(m => m.winner_id === PLAYER_ID && m.surface === 'Grass').length;

    const clayLosses = matches.filter(m => m.loser_id === PLAYER_ID && m.surface === 'Clay').length;
    const hardLosses = matches.filter(m => m.loser_id === PLAYER_ID && m.surface === 'Hard').length;
    const grassLosses = matches.filter(m => m.loser_id === PLAYER_ID && m.surface === 'Grass').length;

    const clayWinRate = (clayWins + clayLosses) > 0 ? ((clayWins / (clayWins + clayLosses)) * 100).toFixed(2) : 0;
    const hardWinRate = (hardWins + hardLosses) > 0 ? ((hardWins / (hardWins + hardLosses)) * 100).toFixed(2) : 0;
    const grassWinRate = (grassWins + grassLosses) > 0 ? ((grassWins / (grassWins + grassLosses)) * 100).toFixed(2) : 0;

    // Slam titles per tournament
    const slamMap = {};
    matches
      .filter(m => m.winner_id === PLAYER_ID && m.round === 'F' && m.tourney_level === 'G')
      .forEach(m => {
        slamMap[m.tourney_name] = (slamMap[m.tourney_name] || 0) + 1;
      });

    const slamTitles = Object.entries(slamMap).map(([tourney, count]) => ({ tourney, count }));

    // Titles by level
    const titlesMapByLevel = {};
    matches
      .filter(m => m.winner_id === PLAYER_ID && m.round === 'F')
      .forEach(m => {
        const lvl = m.tourney_level || 'Unknown';
        titlesMapByLevel[lvl] = (titlesMapByLevel[lvl] || 0) + 1;
      });

    const titlesByLevel = Object.entries(titlesMapByLevel).map(([level, count]) => ({ level, count }));
    const titlesTotal = Object.values(titlesMapByLevel).reduce((a, b) => a + b, 0);

    console.log(`--- Player ${PLAYER_ID} Stats ---`);
    console.log(`Total Matches: ${totalMatches}`);
    console.log(`Career Wins: ${careerWins}`);
    console.log(`Career Losses: ${careerLosses}`);
    console.log(`Clay Wins: ${clayWins} | Win Rate: ${clayWinRate}%`);
    console.log(`Hard Wins: ${hardWins} | Win Rate: ${hardWinRate}%`);
    console.log(`Grass Wins: ${grassWins} | Win Rate: ${grassWinRate}%`);
    console.log(`Total Titles: ${titlesTotal}`);
    console.log('Titles by Level:', titlesByLevel);
    console.log('Slam Titles:', slamTitles);
  } catch (err) {
    console.error('Error fetching player stats:', err);
  }
}

testPlayerStats();
