import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { highlightCodeBlocks } from './shikiHighlighter';
import { slugify } from './blogHelpers';

// Custom renderer to add heading ids and anchor links
const renderer = new marked.Renderer();
renderer.heading = (text, level, raw, slugger) => {
  const id = slugify(raw);
  return `<h${level} id="${id}">${text}<a class="anchor" href="#${id}" aria-hidden="true">¶</a></h${level}>`;
};

export async function markdownToHtml(md: string): Promise<string> {
  const withHighlights = await highlightCodeBlocks(md || '');
  const raw = marked.parse(withHighlights, { renderer });
  const clean = sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'pre', 'code', 'span', 'a', 'div', 'figure', 'figcaption']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class'], // allow class on all tags so Tailwind classes survive sanitization
      a: ['href', 'name', 'target', 'rel', 'aria-hidden'],
      img: ['src', 'alt', 'title', 'width', 'height']
    },
    // preserve safe list of URL protocols
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto']
    }
  });
  return clean;
}
