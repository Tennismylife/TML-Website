import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Provide a minimal mock for next/navigation to satisfy components using useRouter in tests
const __mockReplace = vi.fn();
const __mockBack = vi.fn();

// expose the same mock object globally so tests can assert calls
(globalThis as any).__mockNextRouter = {
  replace: __mockReplace,
  back: __mockBack,
  push: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => {
  return {
    useRouter: () => (globalThis as any).__mockNextRouter,
    usePathname: () => '/',
    useSearchParams: () => ({ get: () => null }),
  };
});

// Minimal ResizeObserver mock for components that use it during layout/scroll sync
// (H2HMatches uses ResizeObserver in a render-time effect)
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Minimal ResizeObserver mock for components that use it during layout/scroll sync
// (H2HMatches uses ResizeObserver in a render-time effect)
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}