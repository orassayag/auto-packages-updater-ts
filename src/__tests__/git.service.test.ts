import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import { GitService } from '../services/git.service.js';
import { createMockLogger } from './mocks/logger.mock.js';

vi.mock('execa');

describe('GitService', () => {
  let gitService: GitService;

  beforeEach((): void => {
    gitService = new GitService(createMockLogger());
    vi.clearAllMocks();
    vi.mocked(execa).mockResolvedValue({} as any);
  });

  it('should call git pull --rebase', async (): Promise<void> => {
    await gitService.pull('path');
    expect(execa).toHaveBeenCalledWith('git', ['pull', '--rebase'], {
      cwd: 'path',
    });
  });

  it('should throw error if git pull fails with stderr', async (): Promise<void> => {
    const error = new Error('msg');
    (error as any).stderr = 'pull error';
    vi.mocked(execa).mockRejectedValue(error);
    await expect(gitService.pull('path')).rejects.toThrow('pull error');
  });

  it('should throw error if git pull fails with message only', async (): Promise<void> => {
    vi.mocked(execa).mockRejectedValue(new Error('msg'));
    await expect(gitService.pull('path')).rejects.toThrow('msg');
  });

  it('should return true if there are uncommitted changes', async (): Promise<void> => {
    vi.mocked(execa).mockResolvedValue({ stdout: 'M file.ts' } as any);
    const result = await gitService.hasUncommittedChanges('path');
    expect(result).toBe(true);
  });

  it('should return false if there are no uncommitted changes', async (): Promise<void> => {
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as any);
    const result = await gitService.hasUncommittedChanges('path');
    expect(result).toBe(false);
  });

  it('should call git add .', async (): Promise<void> => {
    await gitService.add('path');
    expect(execa).toHaveBeenCalledWith('git', ['add', '.'], { cwd: 'path' });
  });

  it('should call git commit', async (): Promise<void> => {
    await gitService.commit('path', 'msg');
    expect(execa).toHaveBeenCalledWith('git', ['commit', '-m', 'msg'], {
      cwd: 'path',
    });
  });

  it('should call git push', async (): Promise<void> => {
    await gitService.push('path');
    expect(execa).toHaveBeenCalledWith('git', ['push', '--force-with-lease'], {
      cwd: 'path',
    });
  });

  it('should throw error if git push fails', async (): Promise<void> => {
    const error = new Error('msg');
    (error as any).stderr = 'push error';
    vi.mocked(execa).mockRejectedValue(error);
    await expect(gitService.push('path')).rejects.toThrow('push error');
  });

  it('should throw error if git push fails with message only', async (): Promise<void> => {
    vi.mocked(execa).mockRejectedValue(new Error('push error'));
    await expect(gitService.push('path')).rejects.toThrow('push error');
  });
});
