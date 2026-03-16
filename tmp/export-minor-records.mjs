import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const SITE = "https://stats.tennismylife.org";

function collectCategoryVals(cat) {
  const vals = [];
  function c(v) {
    if (typeof v === "string") vals.push(v.toUpperCase().trim());
    else if (Array.isArray(v)) v.forEach(c);
    else if (v && typeof v === "object") Object.values(v).forEach(c);
  }
  c(cat);
  return vals;
}

function shouldIndex(category, endDate) {
  const vals = collectCategoryVals(category);
  const ALWAYS = new Set(["G","M","F","O","GRAND_SLAM","MASTERS_1000","FINALS","OLYMPICS"]);
  if (vals.some(v => ALWAYS.has(v))) return true;
  const RECENT = new Set(["500","250","ATP500","ATP250"]);
  if (vals.some(v => RECENT.has(v))) return !!endDate && new Date(endDate).getFullYear() >= 2020;
  return false;
}

function extractName(n) {
  if (!n) return "";
  if (typeof n === "string" && !/^\d+$/.test(n.trim())) return n;
  if (Array.isArray(n)) { const r = n.filter(v => typeof v === "string" && !/^\d+$/.test(v.trim())); return r[r.length-1] || ""; }
  if (typeof n === "object") { const r = Object.values(n).filter(v => typeof v === "string" && !/^\d+$/.test(String(v).trim())); return r[r.length-1] || ""; }
  return "";
}

function extractCat(c) { return [...new Set(collectCategoryVals(c))].join("|"); }

const SUB_PAGES = ["","/count","/count/titles","/count/wins","/count/played","/count/entries","/ages","/ages/main","/ages/titles","/ages/oldestrounds","/ages/youngestrounds","/percentage","/percentage/wins","/percentage/rounds","/streak","/timespan","/rounds","/least","/roundsonentries"];

const all = await prisma.tournament.findMany({ select: { id: true, slug: true, name: true, category: true, endDate: true } });
const excluded = all.filter(t => !shouldIndex(t.category, t.endDate));
excluded.sort((a,b) => String(a.slug).localeCompare(String(b.slug)));

const rows = ["url,tournament_id,slug,name,category,end_year"];
for (const t of excluded) {
  const name = (extractName(t.name) || t.slug).replace(/,/g," ");
  const cat = extractCat(t.category);
  const endYear = t.endDate ? new Date(t.endDate).getFullYear() : "";
  for (const sub of SUB_PAGES) {
    rows.push(`${SITE}/tournaments/${t.slug}/records${sub},${t.id},${t.slug},"${name}",${cat},${endYear}`);
  }
}

writeFileSync("./tmp/minor-tournament-records.csv", rows.join("\n"), "utf8");
console.log(`CSV generato: ${excluded.length} tornei esclusi x ${SUB_PAGES.length} pagine = ${excluded.length * SUB_PAGES.length} righe`);
await prisma.$disconnect();
