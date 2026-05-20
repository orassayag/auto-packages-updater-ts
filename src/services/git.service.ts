import { injectable } from 'inversify';
import { execa } from 'execa';
import { IGitService } from '../interfaces/IGitService.js';

@injectable()
export class GitService implements IGitService {
  async pull(repoPath: string): Promise<void> {
    try {
      await execa('git', ['pull', '--rebase'], { cwd: repoPath });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? (error as any).stderr || error.message
          : String(error);
      throw new Error(`git pull --rebase failed: ${errorMessage}`);
    }
  }

  async getStatus(repoPath: string): Promise<string> {
    const { stdout } = await execa('git', ['status', '--porcelain'], {
      cwd: repoPath,
    });
    return stdout;
  }

  async hasUncommittedChanges(repoPath: string): Promise<boolean> {
    const status = await this.getStatus(repoPath);
    return status.length > 0;
  }

  async add(repoPath: string): Promise<void> {
    await execa('git', ['add', '.'], { cwd: repoPath });
  }

  async commit(repoPath: string, message: string): Promise<void> {
    await execa('git', ['commit', '-m', message], { cwd: repoPath });
  }

  async push(repoPath: string): Promise<void> {
    try {
      await execa('git', ['push', '--force-with-lease'], { cwd: repoPath });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? (error as any).stderr || error.message
          : String(error);
      throw new Error(`git push failed: ${errorMessage}`);
    }
  }
}
