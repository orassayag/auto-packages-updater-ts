import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { UpdaterService } from '../services/updater.service.js';
import { createMockLogger } from './mocks/logger.mock.js';
import { IGitService } from '../interfaces/IGitService.js';
import { IPackageManagerService } from '../interfaces/IPackageManagerService.js';
import { IReportService } from '../interfaces/IReportService.js';
import { IValidationService } from '../interfaces/IValidationService.js';
import { IRepoService } from '../interfaces/IRepoService.js';

describe('UpdaterService', () => {
  let updaterService: UpdaterService;
  let gitService: Mocked<IGitService>;
  let pmService: Mocked<IPackageManagerService>;
  let reportService: Mocked<IReportService>;
  let validationService: Mocked<IValidationService>;
  let repoService: Mocked<IRepoService>;

  beforeEach((): void => {
    gitService = {
      pull: vi.fn(),
      hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      add: vi.fn(),
      commit: vi.fn(),
      push: vi.fn(),
    } as unknown as Mocked<IGitService>;
    pmService = {
      detectPackageManager: vi.fn().mockResolvedValue('npm'),
      getOutdatedPackages: vi.fn().mockResolvedValue({}),
      install: vi.fn(),
      updatePackageJson: vi.fn(),
    } as unknown as Mocked<IPackageManagerService>;
    reportService = {
      addEntry: vi.fn(),
      generateReport: vi.fn(),
      getEntries: vi.fn().mockReturnValue([]),
    } as unknown as Mocked<IReportService>;
    validationService = {
      checkNetwork: vi.fn(),
      validateRepo: vi.fn(),
    } as unknown as Mocked<IValidationService>;
    repoService = {
      getActiveRepos: vi
        .fn()
        .mockResolvedValue([{ name: 'repo1', type: 'active' }]),
    } as unknown as Mocked<IRepoService>;

    updaterService = new UpdaterService(
      gitService,
      pmService,
      reportService,
      validationService,
      repoService,
      createMockLogger()
    );

    // Silence console logs
    vi.spyOn(console, 'log').mockImplementation((): void => {});
    vi.spyOn(console, 'error').mockImplementation((): void => {});
  });

  it('should run the update process for a repo with no updates', async (): Promise<void> => {
    await updaterService.run();

    expect(validationService.checkNetwork).toHaveBeenCalled();
    expect(repoService.getActiveRepos).toHaveBeenCalled();
    expect(gitService.pull).toHaveBeenCalled();
    expect(pmService.getOutdatedPackages).toHaveBeenCalled();
    expect(reportService.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'NO UPDATES' })
    );
    expect(reportService.generateReport).toHaveBeenCalled();
  });

  it('should update a repo when outdated packages are found', async (): Promise<void> => {
    pmService.getOutdatedPackages.mockResolvedValue({
      pkg: { current: '1.0.0', wanted: '2.0.0', latest: '2.0.0' },
    });

    await updaterService.run();

    expect(pmService.updatePackageJson).toHaveBeenCalled();
    expect(pmService.install).toHaveBeenCalled();
    expect(gitService.add).toHaveBeenCalled();
    expect(gitService.commit).toHaveBeenCalled();
    expect(gitService.push).toHaveBeenCalled();
    expect(reportService.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'UPDATED' })
    );
  });

  it('should skip a repo if it has uncommitted changes', async (): Promise<void> => {
    gitService.hasUncommittedChanges.mockResolvedValue(true);

    await updaterService.run();

    expect(gitService.pull).not.toHaveBeenCalled();
    expect(reportService.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SKIPPED' })
    );
  });

  it('should handle errors in a repo and continue', async (): Promise<void> => {
    repoService.getActiveRepos.mockResolvedValue([
      { name: 'repo1', type: 'active' },
      { name: 'repo2', type: 'active' },
    ]);
    gitService.pull.mockRejectedValueOnce(new Error('pull failed'));

    await updaterService.run();

    expect(reportService.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED', repoName: 'repo1' })
    );
    expect(reportService.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ repoName: 'repo2' })
    );
  });

  it('should handle fatal errors in run()', async (): Promise<void> => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('exit');
    });
    validationService.checkNetwork.mockRejectedValue(
      new Error('network fatal')
    );

    await expect(updaterService.run()).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should skip packages with workspace, file, or git protocols', async (): Promise<void> => {
    pmService.getOutdatedPackages.mockResolvedValue({
      pkg1: { current: '1', wanted: '2', latest: 'workspace:*' },
      pkg2: { current: '1', wanted: '2', latest: 'file:../pkg' },
      pkg3: { current: '1', wanted: '2', latest: 'git+https://github.com/...' },
      pkg4: { current: '1', wanted: '2', latest: 'github:user/repo' },
      pkg5: { current: '1', wanted: '2', latest: '2.0.0' },
    });

    await updaterService.run();

    expect(pmService.updatePackageJson).toHaveBeenCalledWith(
      expect.any(String),
      { pkg5: '2.0.0' }
    );
  });
});
