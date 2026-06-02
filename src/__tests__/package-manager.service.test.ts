import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import { execa } from 'execa';
import latestVersion from 'latest-version';
import { PackageManagerService } from '../services/package-manager.service.js';
import { createMockLogger } from './mocks/logger.mock.js';

vi.mock('fs-extra');
vi.mock('execa');
vi.mock('latest-version');

describe('PackageManagerService', () => {
  let pmService: PackageManagerService;

  beforeEach((): void => {
    pmService = new PackageManagerService(createMockLogger());
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
    it('should return outdated packages when newer versions exist', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: {
          pkg1: '^1.0.0',
        },
      });
      vi.mocked(latestVersion).mockResolvedValue('2.0.0');

      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result.pkg1.latest).toBe('2.0.0');
      expect(result.pkg1.current).toBe('1.0.0');
    });

    it('should return empty object if all packages are up to date', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: {
          pkg1: '^2.0.0',
        },
      });
      vi.mocked(latestVersion).mockResolvedValue('2.0.0');

      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result).toEqual({});
    });

    it('should return empty object if package.json does not exist', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockResolvedValue(false);
      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result).toEqual({});
    });

    it('should throw error if package.json is invalid', async (): Promise<void> => {
      vi.mocked(
        fs.pathExists as (p: string) => Promise<boolean>
      ).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockRejectedValue(new Error('invalid json'));
      await expect(
        pmService.getOutdatedPackages('path', 'npm')
      ).rejects.toThrow('Failed to check outdated packages');
    });

    it('should skip non-version dependencies (workspace, file, git, etc.)', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: {
          pkg1: 'workspace:*',
          pkg2: 'file:../pkg2',
          pkg3: 'git+https://github.com/user/repo.git',
          pkg4: 'github:user/repo',
          pkg5: 'https://example.com/pkg5.tgz',
        },
      });

      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result).toEqual({});
      expect(latestVersion).not.toHaveBeenCalled();
    });

    it('should skip packages published too recently', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: { pkg1: '^1.0.0' },
      });
      vi.mocked(latestVersion).mockResolvedValue('2.0.0');

      // Mock npm view for maturity check - return very recent date
      vi.mocked(execa).mockResolvedValue({
        stdout: JSON.stringify({ '2.0.0': new Date().toISOString() }),
      } as any);

      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result).toEqual({});
    });

    it('should allow packages when publish time cannot be fetched', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: { pkg1: '^1.0.0' },
      });
      vi.mocked(latestVersion).mockResolvedValue('2.0.0');

      // Mock npm view failure
      vi.mocked(execa).mockRejectedValue(new Error('npm view failed'));

      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result.pkg1).toBeDefined();
    });

    it('should handle errors when checking individual packages', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: {
          pkg1: '^1.0.0',
          pkg2: '^1.0.0',
        },
      });
      vi.mocked(latestVersion)
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce('2.0.0');

      // For pkg2 maturity check - return old date
      vi.mocked(execa).mockResolvedValue({
        stdout: JSON.stringify({ '2.0.0': '2020-01-01T00:00:00Z' }),
      } as any);

      const result = await pmService.getOutdatedPackages('path', 'npm');
      expect(result.pkg1).toBeUndefined();
      expect(result.pkg2).toBeDefined();
    });
  });

  describe('install', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call pnpm install with correct args and retry on network error', async (): Promise<void> => {
      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({} as any);

      const promise = pmService.install('path', 'pnpm');

      // First attempt fails, wait for delay
      await vi.runAllTimersAsync();

      await promise;

      expect(execa).toHaveBeenCalledTimes(2);
      expect(execa).toHaveBeenCalledWith(
        'pnpm',
        [
          'install',
          '--no-strict-peer-dependencies',
          '--no-frozen-lockfile',
          '--fetch-retries',
          '5',
          '--fetch-retry-mintimeout',
          '10000',
          '--fetch-retry-maxtimeout',
          '60000',
          '--network-concurrency',
          '4',
        ],
        expect.objectContaining({
          timeout: 600000,
        })
      );
    });

    it('should throw error after max attempts', async (): Promise<void> => {
      vi.mocked(execa).mockRejectedValue(new Error('ECONNRESET'));

      const promise = pmService.install('path', 'pnpm');

      // Start expecting the rejection before triggering the timers
      const rejectionExpectation = expect(promise).rejects.toThrow(
        'pnpm install failed'
      );

      // Trigger all retries
      await vi.runAllTimersAsync();

      await rejectionExpectation;
      expect(execa).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-network error', async (): Promise<void> => {
      vi.mocked(execa).mockRejectedValue(new Error('Some other error'));

      await expect(pmService.install('path', 'pnpm')).rejects.toThrow(
        'pnpm install failed'
      );
      expect(execa).toHaveBeenCalledTimes(1);
    });

    it('should call npm install with correct args', async (): Promise<void> => {
      vi.mocked(execa).mockResolvedValue({} as any);
      await pmService.install('path', 'npm');
      expect(execa).toHaveBeenCalledWith(
        'npm',
        ['install', '--legacy-peer-deps'],
        expect.any(Object)
      );
    });

    it('should clean lockfile and retry on pnpm supply-chain error', async (): Promise<void> => {
      const supplyChainError = new Error(
        'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION'
      );
      (supplyChainError as any).stderr =
        'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION';

      vi.mocked(execa)
        .mockRejectedValueOnce(supplyChainError)
        .mockResolvedValueOnce({} as any) // clean lockfile success
        .mockResolvedValueOnce({} as any); // retry install success

      await pmService.install('path', 'pnpm');

      expect(execa).toHaveBeenCalledWith(
        'pnpm',
        ['clean', '--lockfile'],
        expect.any(Object)
      );
      expect(execa).toHaveBeenCalledTimes(3); // 1st install fail, 1 clean, 2nd install success
    });

    it('should not retry if clean lockfile fails', async (): Promise<void> => {
      const supplyChainError = new Error(
        'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION'
      );
      (supplyChainError as any).stderr =
        'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION';

      vi.mocked(execa)
        .mockRejectedValueOnce(supplyChainError)
        .mockRejectedValueOnce(new Error('clean failed'));

      await expect(pmService.install('path', 'pnpm')).rejects.toThrow(
        'pnpm install failed'
      );
      expect(execa).toHaveBeenCalledTimes(2); // 1st install fail, 1 clean fail
    });
  });

  describe('ensureNpmrc', () => {
    it('should create .npmrc if it does not exist', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(false);

      await pmService.ensureNpmrc('path');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.npmrc'),
        expect.stringContaining('fetch-retries=5')
      );
    });

    it('should append missing settings to existing .npmrc', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readFile as any).mockResolvedValue('existing=value\n');

      await pmService.ensureNpmrc('path');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.npmrc'),
        expect.stringContaining('existing=value\nfetch-retries=5')
      );
    });

    it('should not update if all settings exist', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readFile as any).mockResolvedValue(
        'fetch-retries=5\nfetch-retry-mintimeout=10000\nfetch-retry-maxtimeout=60000\nnetwork-concurrency=4\n'
      );

      await pmService.ensureNpmrc('path');

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should log error if updating .npmrc fails', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readFile as any).mockRejectedValue(new Error('read failed'));

      // Should not throw
      await pmService.ensureNpmrc('path');
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

  describe('cleanPnpmWorkspaceExclusions', () => {
    it('should do nothing if workspace file does not exist', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(false);
      await pmService.cleanPnpmWorkspaceExclusions('path');
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should do nothing if exclusion block is not present', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readFile as any).mockResolvedValue(
        'packages:\n  - "apps/*"\n'
      );
      await pmService.cleanPnpmWorkspaceExclusions('path');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should remove minimumReleaseAgeExclude block', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      const original = `packages:
  - "apps/*"
minimumReleaseAgeExclude:
  - pkg1
  - pkg2
otherField: value
`;
      vi.mocked(fs.readFile as any).mockResolvedValue(original);

      await pmService.cleanPnpmWorkspaceExclusions('path');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('packages:\n  - "apps/*"\notherField: value')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.stringContaining('minimumReleaseAgeExclude')
      );
    });

    it('should log error if cleaning fails', async (): Promise<void> => {
      vi.mocked(fs.pathExists as any).mockResolvedValue(true);
      vi.mocked(fs.readFile as any).mockRejectedValue(new Error('read failed'));
      // Should not throw
      await pmService.cleanPnpmWorkspaceExclusions('path');
    });
  });
});
