import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export default async function TournamentMarkdownSection({ file }: { file: string }) {
  const filePath = path.join(process.cwd(), 'public', file);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const html = await marked(raw, { gfm: true });

  return (
    <section
      className="mt-10 pt-6 border-t border-gray-700/60 prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
