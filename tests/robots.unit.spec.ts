import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('robots.txt', () => {
  it('exists and references sitemap', () => {
    const file = path.resolve(__dirname, '..', 'public', 'robots.txt');
    const content = fs.readFileSync(file, 'utf8');
    // accept absolute or relative sitemap XML or sitemap index
    expect(content).toMatch(/Sitemap:\s*(https?:\/\/[^"]+\/(?:sitemap_index\.xml|sitemap\.xml)|\/(?:sitemap_index\.xml|sitemap\.xml))/i);
    expect(content).toMatch(/User-agent:\s*\*/i);
    expect(content).toMatch(/User-agent:\s*Googlebot/i);
    expect(content).toMatch(/Disallow:\s*\//i);
    expect(content).toMatch(/Disallow:\s*\/players\/\*\/ranking/i);
    expect(content).toMatch(/Allow:\s*\/players\/carlos-alcaraz\/ranking\$/i);
    expect(content).toMatch(/Allow:\s*\/players\/jannik-sinner\/ranking\$/i);
  });
});
