export function markdownToHtml(md: string): string {
  if (!md) return '';
  // Escape basic HTML
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Handle fenced code blocks ```
  md = md.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${escapeHtml(code)}</code></pre>`);
  // Convert headings
  md = md.split('\n').map(line => {
    if (/^###\s+/.test(line)) return '<h3>' + line.replace(/^###\s+/, '') + '</h3>';
    if (/^##\s+/.test(line)) return '<h2>' + line.replace(/^##\s+/, '') + '</h2>';
    if (/^#\s+/.test(line)) return '<h1>' + line.replace(/^#\s+/, '') + '</h1>';
    return line;
  }).join('\n');
  // Bold and italics
  md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Links [text](url)
  md = md.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-indigo-300 hover:underline">$1</a>');
  // Paragraphs: split by blank lines
  const parts = md.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const out = parts.map(p => {
    if (/^<(h1|h2|h3|pre)/.test(p)) return p;
    return `<p class="text-gray-300">${p}</p>`;
  }).join('\n');
  return out;
}
