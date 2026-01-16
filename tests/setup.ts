import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Provide a minimal mock for next/navigation to satisfy components using useRouter in tests
vi.mock('next/navigation', () => {
  const replace = vi.fn();
  const back = vi.fn();
  return {
    useRouter: () => ({ replace, back, push: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/',
    useSearchParams: () => ({ get: () => null }),
  };
});