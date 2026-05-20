import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import { execa } from 'execa';
import { PackageManagerService } from '../services/package-manager.service.js';

vi.mock('fs-extra');
vi.mock('execa');

describe('PackageManagerService', () => {
  let pmService: PackageManagerService;

  beforeEach((): void => {
    pmService = new PackageManagerService();
    vi.clearAllMocks();
  });

  describe('detectPackageManager', () => {
    it('should detect pnpm if lockfile exists', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockImplementation((p: string) =>
        Promise.resolve(p.includes('pnpm-lock.yaml'))
      );
      const pm = await pmService.detectPackageManager('path');
      expect(pm).toBe('pnpm');
    });

    it('should detect npm if lockfile exists', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockImplementation((p: string) =>
        Promise.resolve(p.includes('package-lock.json'))
      );
      const pm = await pmService.detectPackageManager('path');
      expect(pm).toBe('npm');
    });

    it('should detect pnpm from packageManager field in package.json', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockImplementation(() => Promise.resolve(false));
      vi.mocked(fs.readJson).mockImplementation(() =>
        Promise.resolve({
          packageManager: 'pnpm@9.0.0',
        })
      );
      const pm = await pmService.detectPackageManager('path');
      expect(pm).toBe('pnpm');
    });

    it('should default to npm if no indicators found', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockImplementation(() => Promise.resolve(false));
      vi.mocked(fs.readJson).mockImplementation(() =>
        Promise.reject(new Error('not found'))
      );
      const pm = await pmService.detectPackageManager('path');
      expect(pm).toBe('npm');
    });
  });

  describe('getOutdatedPackages', () => {
    it('should return parsed JSON output', async (): Promise<void> => {
      vi.mocked(execa).mockResolvedValue({
        stdout: JSON.stringify({
          pkg: { current: '1', wanted: '2', latest: '2' },
        }),
      } as any);
      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result.pkg.latest).toBe('2');
    });

    it('should throw error if JSON is invalid', async (): Promise<void> => {
      vi.mocked(execa).mockResolvedValue({ stdout: 'invalid json' } as any);
      await expect(
        pmService.getOutdatedPackages('path', 'npm')
      ).rejects.toThrow('Failed to parse');
    });

    it('should return empty object if no output', async (): Promise<void> => {
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any);
      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result).toEqual({});
    });
  });

  describe('install', () => {
    it('should call pnpm install with correct args', async (): Promise<void> => {
      await pmService.install('path', 'pnpm');
      expect(execa).toHaveBeenCalledWith(
        'pnpm',
        ['install', '--no-strict-peer-dependencies'],
        expect.any(Object)
      );
    });

    it('should call npm install with correct args', async (): Promise<void> => {
      await pmService.install('path', 'npm');
      expect(execa).toHaveBeenCalledWith(
        'npm',
        ['install', '--legacy-peer-deps'],
        expect.any(Object)
      );
    });
  });

  describe('updatePackageJson', () => {
    it('should update versions with prefixes in package.json', async (): Promise<void> => {
      const pkgJson = {
        dependencies: { pkg1: '^1.0.0' },
        devDependencies: { pkg2: '~1.0.0' },
      };
      vi.mocked(fs.readJson).mockResolvedValue(pkgJson);

      await pmService.updatePackageJson('path', {
        pkg1: '2.0.0',
        pkg2: '2.0.0',
      });

      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          dependencies: { pkg1: '^2.0.0' },
          devDependencies: { pkg2: '~2.0.0' },
        }),
        expect.any(Object)
      );
    });

    it('should update versions without prefixes', async (): Promise<void> => {
      const pkgJson = { dependencies: { pkg1: '1.0.0' } };
      vi.mocked(fs.readJson).mockResolvedValue(pkgJson);

      await pmService.updatePackageJson('path', { pkg1: '2.0.0' });

      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          dependencies: { pkg1: '2.0.0' },
        }),
        expect.any(Object)
      );
    });
  });
});
