import { test, expect } from '@playwright/test';
import http from 'http';

test.describe('SSR streaming sanity', () => {
  test('page /tournaments/australian-open/2026 never streams 404 HTML', async ({ baseURL }) => {
    const url = `${baseURL}/tournaments/australian-open/2026`;
    await new Promise<void>((resolve, reject) => {
      const req = http.get(url, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (chunk.includes('404: This page could not be found') || chunk.includes('This page could not be found.')) {
            req.abort();
            reject(new Error('Stream contained 404 fallback'));
          }
        });
        res.on('end', () => resolve());
      });
      req.on('error', (err) => reject(err));
    });

    // If we reach here, no 404 text was streamed
    expect(true).toBeTruthy();
  });
});
