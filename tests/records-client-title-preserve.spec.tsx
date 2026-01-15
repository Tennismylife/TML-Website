import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../../app/records/RecordsClient', async () => {
  // Return the real module so we can import the component; but we'll mock generateRecordDescription separately
  return await vi.importActual('../../app/records/RecordsClient');
});

// Partially mock next/navigation router to avoid requiring the Next app router in unit tests
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: () => {}, replace: () => {} }),
  };
});

vi.mock('@/lib/generateRecordDescription', () => ({
  generateRecordDescription: vi.fn(() => 'Youngest Title Winners'),
}));

import RecordsClient from '@/app/records/RecordsClient';

describe('RecordsClient preserves server SEO title', () => {
  let originalTitle: string | undefined;

  beforeEach(() => {
    originalTitle = (global as any).document.title;
  });

  afterEach(() => {
    if (originalTitle !== undefined) (global as any).document.title = originalTitle;
    vi.clearAllMocks();
  });

  it('does not overwrite a server SEO title that contains "| Tennis Records"', async () => {
    (global as any).document.title = 'Youngest Title Winners at Australian Open | Tennis Records';
    render(<RecordsClient initialRecord={'ages'} initialSubtab={'youngest-winners'} /> as any);
    // allow effects to run
    await new Promise((r) => setTimeout(r, 0));
    expect(document.title).toBe('Youngest Title Winners at Australian Open | Tennis Records');
  });

  it('does not override the title for the least tab (preserve server SEO)', async () => {
    (global as any).document.title = 'Old Title';
    render(<RecordsClient initialRecord={'least'} initialSubtab={null} /> as any);
    // allow effects to run
    await new Promise((r) => setTimeout(r, 0));
    expect(document.title).toBe('Old Title');
  });
});