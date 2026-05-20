import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import { execa } from 'execa';
import { ValidationService } from '../services/validation.service.js';

vi.mock('fs-extra');
vi.mock('execa');

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach((): void => {
    validationService = new ValidationService();
    vi.clearAllMocks();
  });

  describe('checkNetwork', () => {
    it('should not throw if npm ping succeeds', async (): Promise<void> => {
      vi.mocked(execa).mockResolvedValue({} as any);
      await expect(validationService.checkNetwork()).resolves.not.toThrow();
    });

    it('should throw if npm ping fails', async (): Promise<void> => {
      vi.mocked(execa).mockRejectedValue(new Error('timeout'));
      await expect(validationService.checkNetwork()).rejects.toThrow(
        'NPM registry is unreachable'
      );
    });
  });

  describe('validateRepo', () => {
    it('should throw if repo path does not exist', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockImplementation(() => Promise.resolve(false));
      await expect(validationService.validateRepo('path')).rejects.toThrow(
        'Repo directory not found'
      );
    });

    it('should throw if package.json does not exist', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockImplementation((p: string) => Promise.resolve(p === 'path'));
      await expect(validationService.validateRepo('path')).rejects.toThrow(
        'package.json not found'
      );
    });

    it('should not throw if repo and package.json exist', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockImplementation(() => Promise.resolve(true));
      await expect(
        validationService.validateRepo('path')
      ).resolves.not.toThrow();
    });
  });
});
