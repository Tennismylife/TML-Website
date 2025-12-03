import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = globalThis.prisma || new PrismaClient();
if (!globalThis.prisma) globalThis.prisma = prisma;

// Cosine similarity tra due vettori
function cosineSim(a: number[], b: number[]) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

// Serializzazione sicura dei BigInt (ricorsiva)
function safeSerialize(obj: any): any {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(safeSerialize);
  if (obj && typeof obj === 'object') {
    const res: any = {};
    for (const key in obj) {
      res[key] = safeSerialize(obj[key]);
    }
    return res;
  }
  return obj;
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // 1ï¸âƒ£ Embedding da Ollama
    const embRes = await fetch(`${process.env.OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: query }),
    });

    if (!embRes.ok) {
      const text = await embRes.text();
      throw new Error(`Embedding API error: ${text}`);
    }

    const embData = await embRes.json();
    const embedding: number[] = embData.embedding;

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding returned from Ollama");
    }

    // 2ï¸âƒ£ Recupera tutti i match con raw SQL
    const allMatches: any[] = await prisma.$queryRaw<any[]>`
      SELECT id, tourney_name, winner_name, loser_name, score, surface, round, tourney_date, embedding
      FROM "Match"
    `;

    // 3ï¸âƒ£ Normalizza embedding in number[]
    const processedMatches = allMatches.map((m) => {
      let embArray: number[] = [];

      if (Buffer.isBuffer(m.embedding)) {
        const float32 = new Float32Array(
          m.embedding.buffer,
          m.embedding.byteOffset,
          m.embedding.length / 4
        );
        embArray = Array.from(float32);
      } else if (typeof m.embedding === "string") {
        embArray = m.embedding.replace(/[{}]/g, "").split(",").map(parseFloat);
      } else if (Array.isArray(m.embedding)) {
        embArray = m.embedding;
      } else {
        console.warn("Unknown embedding format for match", m.id, m.embedding);
      }

      return { ...m, embedding: embArray };
    });

    // 4ï¸âƒ£ Calcola cosine similarity e seleziona top 3
    const matches = processedMatches
      .map((m) => ({ ...m, similarity: cosineSim(embedding, m.embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    // 5ï¸âƒ£ Costruzione contesto per il modello
    const context = matches
      .map(
        (m) =>
          `${m.tourney_name}: ${m.winner_name} vs ${m.loser_name}, ${m.score}. Surface: ${m.surface}`
      )
      .join("\n");

    const prompt = `Domanda: ${query}\n\nContesto:\n${context}\n\nRisposta:`;

    // 6ï¸âƒ£ Chiamata al modello generativo
    const chatRes = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama2:latest", prompt, stream: false }),
    });

    if (!chatRes.ok) {
      const text = await chatRes.text();
      throw new Error(`Generate API error: ${text}`);
    }

    const chatData = await chatRes.json();
    const response = chatData.response;

    // 7ï¸âƒ£ Serializza BigInt e restituisci JSON
    return NextResponse.json(safeSerialize({ answer: response, matches }));
  } catch (err: any) {
    console.error("âŒ Errore in /api/rag:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


