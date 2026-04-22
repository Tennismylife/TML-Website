import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function getSlugsFromUrl(url: string): [string, string] | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || parts[0] !== 'h2h') return null;
    const match = parts[1].match(/^(.+)-vs-(.+)$/);
    if (!match) return null;
    return [match[1], match[2]];
  } catch {
    return null;
  }
}

function slugToName(slug: string) {
  return slug.replace(/-/g, ' ');
}

async function findPlayer(slug: string) {
  const direct = await prisma.player.findUnique({ where: { slug } as any, select: { id: true, atpname: true, slug: true } });
  if (direct) return direct;
  const name = slugToName(slug);
  return await prisma.player.findFirst({ where: { atpname: { equals: name, mode: 'insensitive' } }, select: { id: true, atpname: true, slug: true } });
}

async function playerIsActive(playerId: string, latestRankingDateId: number | null) {
  if (!playerId) return false;
  if (latestRankingDateId) {
    const currentRanking = await prisma.ranking.findFirst({ where: { playerId, rankingDateId: latestRankingDateId }, select: { id: true } });
    if (currentRanking) return true;
  }
  const last18Months = new Date();
  last18Months.setUTCMonth(last18Months.getUTCMonth() - 18);
  const recentMatch = await prisma.match.findFirst({ where: { status: true, tourney_date: { gte: last18Months }, OR: [{ winner_id: playerId }, { loser_id: playerId }] }, select: { id: true } });
  return Boolean(recentMatch);
}

async function playerHasEverBeenTop20(playerId: string) {
  if (!playerId) return false;
  const everTop20 = await prisma.ranking.findFirst({ where: { playerId, rank: { lte: 20 } }, select: { id: true } });
  return Boolean(everTop20);
}

async function playerHasDirectH2HMatch(p1: string, p2: string) {
  const match = await prisma.match.findFirst({ where: { status: true, OR: [{ winner_id: p1, loser_id: p2 }, { winner_id: p2, loser_id: p1 }] }, select: { id: true } });
  return Boolean(match);
}

async function main() {
  const sourcePath = 'C:/Users/andre/Downloads/Pagine_h2h.csv';
  const outputPath = path.resolve(process.cwd(), 'tmp', 'Pagine_h2h_indexability.csv');

  if (!fs.existsSync(sourcePath)) {
    console.error('Source CSV not found:', sourcePath);
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines[0].split(',');
  const urlIndex = 0;

  const latestRankingDate = await prisma.rankingDate.findFirst({ orderBy: { date: 'desc' }, select: { id: true } });
  const latestRankingDateId = latestRankingDate?.id ?? null;

  const out = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  out.write('url,indexable,reason,p1_id,p1_name,p1_slug,p2_id,p2_name,p2_slug\n');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const url = cols[urlIndex].trim();
    const slugs = getSlugsFromUrl(url);
    if (!slugs) {
      out.write(`${url},false,invalid_url,,,,,,\n`);
      continue;
    }
    const [s1, s2] = slugs;
    const p1 = await findPlayer(s1);
    const p2 = await findPlayer(s2);
    if (!p1 || !p2) {
      const reason = !p1 && !p2 ? 'missing_both_players' : !p1 ? 'missing_player1' : 'missing_player2';
      out.write(`${url},false,${reason},${p1?.id ?? ''},${p1?.atpname ?? ''},${p1?.slug ?? ''},${p2?.id ?? ''},${p2?.atpname ?? ''},${p2?.slug ?? ''}\n`);
      continue;
    }

    const p1Active = await playerIsActive(p1.id, latestRankingDateId);
    const p2Active = await playerIsActive(p2.id, latestRankingDateId);
    const p1EverTop20 = await playerHasEverBeenTop20(p1.id);
    const p2EverTop20 = await playerHasEverBeenTop20(p2.id);
    const p1Eligible = p1Active || p1EverTop20;
    const p2Eligible = p2Active || p2EverTop20;
    let indexable = false;
    let reason = '';

    if (p1Active && p2Active) {
      indexable = true;
      reason = 'both_active';
    } else if (p1Eligible && p2Eligible && (p1EverTop20 || p2EverTop20)) {
      const direct = await playerHasDirectH2HMatch(p1.id, p2.id);
      indexable = direct;
      reason = direct ? 'direct_h2h_and_top20' : 'no_direct_h2h';
    } else {
      reason = 'not_eligible';
    }

    out.write(`${url},${indexable},${reason},${p1.id},${p1.atpname},${p1.slug},${p2.id},${p2.atpname},${p2.slug}\n`);
  }

  out.end();
  console.log('Output written to', outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});