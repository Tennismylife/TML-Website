import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('robots.txt', () => {
  it('exists and references sitemap', () => {
    const file = path.resolve(__dirname, '..', 'public', 'robots.txt');
    const content = fs.readFileSync(file, 'utf8');
    // accept absolute or relative sitemap URL
    expect(content).toMatch(/Sitemap:\s*(https?:\/\/[^\s]+\/sitemap.xml|\/sitemap.xml)/i);
    expect(content).toMatch(/User-agent:\s*\*/i);
  });
});
