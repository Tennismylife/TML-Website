import { vi, describe, it, expect, beforeEach } from 'vitest';

// We'll require the module dynamically to allow changing env vars before import
const MODULE_PATH = '../../scripts/refresh-mvs-listener.js';

describe('refresh-mvs-listener', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear env overrides between tests
    delete process.env.REFRESH_CONCURRENTLY;
    delete process.env.MV_REFRESH_DEBOUNCE_MS;
    delete process.env.DATABASE_URL;
  });

  it('refreshAll calls REFRESH for each materialized view', async () => {
    const { refreshAll } = require(MODULE_PATH);

    const unsafe = vi.fn().mockResolvedValue(undefined);
    const sql = { unsafe } as any;

    await refreshAll(sql);

    // ensure we at least attempted to refresh some MVs and the command looks correct
    expect(unsafe).toHaveBeenCalled();
    expect(unsafe.mock.calls[0][0]).toContain('REFRESH MATERIALIZED VIEW');
  });

  it('refreshAll uses CONCURRENTLY when REFRESH_CONCURRENTLY=1', async () => {
    process.env.REFRESH_CONCURRENTLY = '1';
    vi.resetModules();
    const { refreshAll } = require(MODULE_PATH);

    const unsafe = vi.fn().mockResolvedValue(undefined);
    const sql = { unsafe } as any;

    await refreshAll(sql);

    expect(unsafe).toHaveBeenCalled();
    expect(unsafe.mock.calls[0][0]).toContain('REFRESH MATERIALIZED VIEW CONCURRENTLY');
  });

  it('one-shot refresh can be invoked programmatically', async () => {
    const unsafe = vi.fn().mockResolvedValue(undefined);
    const end = vi.fn().mockResolvedValue(undefined);
    const sql = { unsafe, end } as any;

    const { refreshAll } = require(MODULE_PATH);

    await refreshAll(sql);
    // simulate main's cleanup
    await sql.end();

    expect(unsafe).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
  });
});
