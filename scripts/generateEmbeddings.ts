import { PrismaClient } from '@prisma/client';
import { OllamaEmbeddings } from '@langchain/ollama';

const prisma = new PrismaClient();
const embeddings = new OllamaEmbeddings({
  model: 'nomic-embed-text',
});

async function generateEmbeddings() {
  try {
    console.log('Starting embedding generation...');

    // Prendi solo i match senza embedding
    const matches = await prisma.match.findMany({
    });
    console.log(`Found ${matches.length} matches without embeddings.`);

    const batchSize = 500; // batch grande per dataset grande
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matches.length / batchSize)}`);

      const updates = await Promise.all(
        batch.map(async (match) => {
          // Concatenazione di tutti i campi tranne id e embedding
          const text = Object.entries(match)
            .filter(([key, value]) => key !== 'id' && key !== 'embedding' && value != null)
            .map(([_, value]) => value.toString())
            .join(' ')
            .trim();

          if (!text) {
            console.warn(`Match ${match.id} has no text. Setting empty embedding.`);
            return { id: match.id, vector: [] };
          }

          try {
            const vector = await embeddings.embedQuery(text);
            return { id: match.id, vector };
          } catch (error) {
            console.error(`Error embedding match ${match.id}:`, error);
            return { id: match.id, vector: [] };
          }
        })
      );

      // Aggiorna tutti gli embeddings del batch in un'unica query
      const values = updates
        .map(
          (u) => `(${u.id}, ARRAY[${u.vector.join(',')}]::double precision[])`
        )
        .join(', ');

      if (values) {
        await prisma.$executeRawUnsafe(`
          UPDATE "Match" AS m
          SET embedding = v.vector
          FROM (VALUES ${values}) AS v(id, vector)
          WHERE m.id = v.id
        `);
      }
    }

    console.log('Embeddings generated successfully for all matches.');
  } catch (error) {
    console.error('Error in generateEmbeddings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateEmbeddings();
