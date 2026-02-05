#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { meta: {}, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: content };
  const fm = content.slice(3, end).trim();
  const body = content.slice(end + 4).trim();
  const meta = {};
  for (const line of fm.split(/\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      const key = m[1].trim();
      let val = m[2].trim();
      meta[key] = val.replace(/^"|"$/g, '');
    }
  }
  return { meta, body };
}

function mdToHtmlSimple(md) {
  if (!md) return '';
  // headings
  const lines = md.split(/\n/);
  let out = [];
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push('<p>' + escapeHtml(paragraph.join(' ')) + '</p>');
      paragraph = [];
    }
  };
  for (const line of lines) {
    const l = line.trim();
    if (l === '') { flushParagraph(); continue; }
    if (l.startsWith('### ')) { flushParagraph(); out.push('<h3>' + escapeHtml(l.slice(4)) + '</h3>'); continue; }
    if (l.startsWith('## ')) { flushParagraph(); out.push('<h2>' + escapeHtml(l.slice(3)) + '</h2>'); continue; }
    if (l.startsWith('# ')) { flushParagraph(); out.push('<h1>' + escapeHtml(l.slice(2)) + '</h1>'); continue; }
    paragraph.push(l);
  }
  flushParagraph();
  return out.join('\n');
}

function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeXml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function build() {
  let files = [];
  try { files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx')); } catch (e) { files = []; }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://stats.tennismylife.org';
  const items = [];
  for (const file of files) {
    const slug = file.replace(/\.(md|mdx)$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const url = `${siteUrl}/blog/${encodeURIComponent(slug)}`;
    const title = escapeXml(meta.title || slug);
    const pubDate = meta.date ? new Date(meta.date).toUTCString() : new Date().toUTCString();
    const description = escapeXml(meta.summary || '');
    const contentHtml = mdToHtmlSimple(body);
    items.push(`  <item>\n    <title>${title}</title>\n    <link>${url}</link>\n    <guid isPermaLink="true">${url}</guid>\n    <pubDate>${pubDate}</pubDate>\n    <description>${description}</description>\n    <content:encoded><![CDATA[${contentHtml}]]></content:encoded>\n  </item>`);
  }

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n<channel>\n  <title>Tennis My Life — Blog</title>\n  <link>${siteUrl}/blog</link>\n  <description>Articles and commentary on tennis statistics.</description>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${items.join('\n')}\n</channel>\n</rss>`;

  const outPath = path.join(process.cwd(), 'public', 'feed.xml');
  fs.writeFileSync(outPath, rss, 'utf8');
  console.log('feed.xml written to', outPath);
}

build().catch(err => { console.error(err); process.exit(1); });