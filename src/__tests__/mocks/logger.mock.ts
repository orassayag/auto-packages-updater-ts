import { vi } from 'vitest';
import { ILogger } from '../../interfaces/ILogger.js';

export const createMockLogger = (): ILogger => ({
  setContext: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});
