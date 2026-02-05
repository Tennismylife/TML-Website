import fs from 'fs/promises';
import path from 'path';
import { markdownToHtml } from './markdown';
import { serialize } from 'next-mdx-remote/serialize';
import { extractHeadings, readingTime } from './blogHelpers';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function parseFrontmatter(content: string) {
  if (!content.startsWith('---')) return { meta: {}, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: content };
  const fm = content.slice(3, end).trim();
  const body = content.slice(end + 4).trim();
  const meta: Record<string, any> = {};
  for (const line of fm.split(/\n/)) {
    const trimmedLine = line.trim();
    const m = trimmedLine.match(/^([\w-]+):\s*(.*)$/);
    if (m) {
      const key = m[1].trim();
      const rawVal = m[2].trim();
      // boolean
      if (/^(true|false)$/i.test(rawVal)) {
        meta[key] = rawVal.toLowerCase() === 'true';
        continue;
      }
      // date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(rawVal)) {
        meta[key] = rawVal.replace(/^"|"$/g, '');
        continue;
      }
      // array like [a, b, c]
      if (/^\[.*\]$/.test(rawVal)) {
        const items = rawVal.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        meta[key] = items;
        continue;
      }
      // fallback string (strip surrounding quotes if present)
      meta[key] = rawVal.replace(/^"|"$/g, '');
    }
  }
  return { meta, body };
}

export async function getAllPosts() {
  let files: string[] = [];
  try {
    files = (await fs.readdir(BLOG_DIR)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  } catch (e) {
    return [];
  }

  // Prefer .mdx files when duplicates exist and deduplicate by slug
  files.sort((a, b) => {
    if (a.endsWith('.mdx') && b.endsWith('.md')) return -1;
    if (a.endsWith('.md') && b.endsWith('.mdx')) return 1;
    return a.localeCompare(b);
  });

  const postsMap = new Map<string, any>();
  for (const file of files) {
    const slug = file.replace(/\.(md|mdx)$/, '');
    if (postsMap.has(slug)) continue; // already have preferred variant
    const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf8');
    const { meta } = parseFrontmatter(raw);
    const { humanizeSlug } = await import('./blogHelpers');
    // detect generated thumbnail and add cache-busted URL if present
    let thumbnail: string | null = null;
    try {
      const thumbPath = path.join(process.cwd(), 'public', 'blog', 'thumbs', `${slug}.png`);
      const stat = await fs.stat(thumbPath);
      thumbnail = `/blog/thumbs/${slug}.png?v=${stat.mtimeMs}`;
    } catch (e) {
      // no thumbnail present
    }
    postsMap.set(slug, { slug, title: meta.title ?? humanizeSlug(slug), date: meta.date ?? null, summary: meta.summary ?? '', author: meta.author ?? null, thumbnail });
  }

  const posts = Array.from(postsMap.values());
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

export async function getPostBySlug(slug: string) {
  if (!slug) {
    try { console.error('getPostBySlug called with invalid slug:', slug); } catch (e) {}
    return null;
  }
  // Support .md and .mdx
  // Prefer MDX when present (richer content + components)
  const paths = [path.join(BLOG_DIR, slug + '.mdx'), path.join(BLOG_DIR, slug + '.md')];
  for (const file of paths) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      // debug: show parsed frontmatter to verify showToc
      try { console.log('debug:getPostBySlug meta for', file, meta); } catch (e) {}
      // If MDX, serialize for next-mdx-remote; otherwise render HTML
      // compute TOC and reading time from raw body
      const toc = extractHeadings(body);
      const rt = readingTime(body);

      if (file.endsWith('.mdx')) {
        const highlighted = await (await import('./shikiHighlighter')).highlightCodeBlocks(body);
        const remarkSlug = (await import('remark-slug')).default as unknown as any;
        // Compile MDX with production JSX runtime to avoid references to _jsxDEV on the client
        const mdxSource = await serialize(highlighted, { mdxOptions: { remarkPlugins: [remarkSlug], development: false } });
        // Strip MDX import/export lines before generating server-rendered HTML so imports don't appear in the markup
        const htmlSource = highlighted.replace(/^\s*(import|export).*?(?:\r?\n|$)/gm, '');
        const contentHtml = await markdownToHtml(htmlSource);
        const { humanizeSlug } = await import('./blogHelpers');
        return { slug, title: meta.title ?? humanizeSlug(slug), date: meta.date ?? null, author: meta.author ?? null, summary: meta.summary ?? '', mdxSource, contentHtml, toc, readingTime: rt, showToc: meta.showToc ?? true };
      } else {
        const html = await markdownToHtml(body);
        return { slug, title: meta.title ?? slug, date: meta.date ?? null, author: meta.author ?? null, summary: meta.summary ?? '', contentHtml: html, toc, readingTime: rt, showToc: meta.showToc ?? true };
      }
    } catch (e) {
      // Log error for debugging and continue to next extension
      // This will surface what's failing in the MDX pipeline (shiki/serialize/rehype)
      try {
        console.error(`getPostBySlug: failed processing file ${file}:`, e && (e.stack || e.message || e));
      } catch (logErr) {
        // ignore logging failures
      }
    }
  }
  return null;
}
