import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
});
