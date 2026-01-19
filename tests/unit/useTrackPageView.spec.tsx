/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/records/counterseasons/round'
}));

// Dynamically import so the mock above is applied
const TestComponent = () => {
  // require inside so the hook reads the mocked usePathname
  const useTrackPageView = require('../../lib/hooks/useTrackPageView').default;
  useTrackPageView();
  return <div />;
};

describe.skip('useTrackPageView', () => {
  let origNodeEnv: string | undefined;
  beforeEach(() => {
    origNodeEnv = process.env.NODE_ENV;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as any));
  });
  afterEach(() => {
    process.env.NODE_ENV = origNodeEnv;
    vi.restoreAllMocks();
  });

  it('does not call /api/track-visit when NODE_ENV is development', async () => {
    process.env.NODE_ENV = 'development';
    render(<TestComponent />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls /api/track-visit when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    render(<TestComponent />);
    // effect is async but should trigger fetch synchronously in this simple case
    expect(global.fetch).toHaveBeenCalled();
  });
});