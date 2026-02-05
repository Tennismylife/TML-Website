let highlighterPromise: Promise<any> | null = null;
function getHigh() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(mod => mod.createHighlighter({ theme: 'nord' } as any)).catch(err => { highlighterPromise = null; throw err; });
  }
  return highlighterPromise;
}

export async function highlightCodeBlocks(md: string) {
  if (!md) return md;
  const highlighter = await getHigh();
  // Replace fenced code blocks ```lang\ncode\n``` with a JSX-safe wrapper
  return md.replace(/```([a-zA-Z0-9-]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    try {
      const langSafe = (lang || 'text').toLowerCase();
      const html = highlighter.codeToHtml(code, { lang: langSafe });
      // Return a JSX element that injects the highlighted HTML safely without relying on rehype-raw
      return `<div className="shiki-highlight" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />`;
    } catch (e) {
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
  });
}

function escapeHtml(s: string) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}