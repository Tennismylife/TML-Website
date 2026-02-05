export function slugify(text: string) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function extractHeadings(md: string) {
  const lines = String(md || '').split(/\r?\n/);
  const headings: Array<{ id: string; text: string; level: number }> = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      const id = slugify(text);
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function readingTime(md: string) {
  const text = String(md || '').replace(/```[\s\S]*?```/g, ''); // remove code blocks
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes };
}

export function humanizeSlug(slug: string) {
  if (!slug) return '';
  // remove leading date pattern YYYY-MM-DD- if present
  const s = slug.replace(/^\d{4}-\d{2}-\d{2}-?/, '');
  return s
    .split(/[-_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
