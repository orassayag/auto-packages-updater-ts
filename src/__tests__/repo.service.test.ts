import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import { RepoService } from '../services/repo.service.js';

vi.mock('fs-extra');

describe('RepoService', () => {
  let repoService: RepoService;

  beforeEach((): void => {
    repoService = new RepoService();
    vi.clearAllMocks();
  });

  it('should throw error if config file does not exist', async (): Promise<void> => {
    vi.mocked(
      fs.pathExists as (p: string) => Promise<boolean>
    ).mockResolvedValue(false);
    await expect(repoService.getActiveRepos()).rejects.toThrow(
      'Config file not found'
    );
  });

  it('should return active repos', async (): Promise<void> => {
    vi.mocked(
      fs.pathExists as (p: string) => Promise<boolean>
    ).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue([
      { name: 'repo1', type: 'active' },
      { name: 'repo2', type: 'inactive' },
    ]);

    const repos = await repoService.getActiveRepos();
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('repo1');
  });

  it('should throw error if no active repos found', async (): Promise<void> => {
    vi.mocked(
      fs.pathExists as (p: string) => Promise<boolean>
    ).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue([
      { name: 'repo1', type: 'inactive' },
    ]);

    await expect(repoService.getActiveRepos()).rejects.toThrow(
      'No active repos found'
    );
  });

  it('should throw error if validation fails', async (): Promise<void> => {
    vi.mocked(
      fs.pathExists as (p: string) => Promise<boolean>
    ).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue({ invalid: 'data' });

    await expect(repoService.getActiveRepos()).rejects.toThrow(
      'Failed to load repos'
    );
  });
});
