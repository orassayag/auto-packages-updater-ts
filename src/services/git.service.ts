import { injectable, inject } from 'inversify';
import { execa } from 'execa';
import { TYPES } from '../constants/types.js';
import { IGitService } from '../interfaces/IGitService.js';
import { ILogger } from '../interfaces/ILogger.js';

@injectable()
export class GitService implements IGitService {
  constructor(@inject(TYPES.ILogger) private readonly logger: ILogger) {
    this.logger.setContext('GitService');
  }

  async pull(repoPath: string): Promise<void> {
    this.logger.debug(`Running git pull --rebase in ${repoPath}`);
    try {
      await execa('git', ['pull', '--rebase'], { cwd: repoPath });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? (error as any).stderr || error.message
          : String(error);
      this.logger.error(
        `git pull --rebase failed in ${repoPath}`,
        error as Error
      );
      throw new Error(`git pull --rebase failed: ${errorMessage}`);
    }
  }

  async getStatus(repoPath: string): Promise<string> {
    this.logger.debug(`Running git status --porcelain in ${repoPath}`);
    const { stdout } = await execa('git', ['status', '--porcelain'], {
      cwd: repoPath,
    });
    return stdout;
  }

  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    const status = await this.getStatus(repoPath);
    const hasChanges = status.length > 0;
    if (hasChanges) {
      this.logger.debug(`Uncommitted changes detected in ${repoPath}`);
    }
    return hasChanges;
  }

  async add(repoPath: string): Promise<void> {
    this.logger.debug(`Running git add . in ${repoPath}`);
    await execa('git', ['add', '.'], { cwd: repoPath });
  }

  async commit(repoPath: string, message: string): Promise<void> {
    this.logger.debug(`Running git commit -m "${message}" in ${repoPath}`);
    await execa('git', ['commit', '-m', message], { cwd: repoPath });
  }

  async push(repoPath: string): Promise<void> {
    this.logger.debug(`Running git push --force-with-lease in ${repoPath}`);
    try {
      await execa('git', ['push', '--force-with-lease'], { cwd: repoPath });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? (error as any).stderr || error.message
          : String(error);
      this.logger.error(`git push failed in ${repoPath}`, error as Error);
      throw new Error(`git push failed: ${errorMessage}`);
    }
  }
}
