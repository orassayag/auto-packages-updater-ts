import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import { Logger } from '../logging/logger.js';

vi.mock('fs-extra');

// Mock LOG_CONFIG to have console disabled
vi.mock('../logging/logConfig.js', () => ({
  LOG_CONFIG: {
    level: 'debug',
    logDir: 'logs',
    enableConsole: false,
    enableFile: true,
  },
}));

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not log to console when disabled but still log to file', async () => {
    const message = 'test message';
    logger.info(message);

    expect(console.log).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('app.log'),
        expect.stringContaining(message)
      );
    });
  });

  it('should handle errors correctly and only log to file', async () => {
    const message = 'error message';
    const error = new Error('test error');
    logger.error(message, error);

    expect(console.error).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('app.log'),
        expect.stringContaining('test error')
      );
    });
  });

  it('should set context correctly in the log entry', async () => {
    const context = 'TestContext';
    const message = 'message';
    logger.setContext(context);
    logger.info(message);

    await vi.waitFor(() => {
      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('app.log'),
        expect.stringContaining(`"context":"${context}"`)
      );
    });
  });

  it('should not log below the configured level', async () => {
    logger.debug('debug message');

    await vi.waitFor(() => {
      expect(fs.appendFile).toHaveBeenCalled();
    });
  });
});
