import { injectable, inject } from 'inversify';
import { execa } from 'execa';
import { TYPES } from '../constants/types.js';
import { IGitService } from '../interfaces/IGitService.js';
import { ILogger } from '../interfaces/ILogger.js';

const GIT_NETWORK_ERRORS = [
  'Could not resolve host',
  'ECONNRESET',
  'ENOTFOUND',
  'timed out',
  'Connection refused',
  'unable to access',
  'Failed to connect',
];

const isGitNetworkError = (error: unknown): boolean => {
  const msg =
    error instanceof Error
      ? (error as any).stderr || error.message
      : String(error);
  return GIT_NETWORK_ERRORS.some((e) => msg.includes(e));
};

@injectable()
export class GitService implements IGitService {
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 5_000;

  constructor(@inject(TYPES.ILogger) private readonly logger: ILogger) {
    this.logger.setContext('GitService');
  }

  private async withRetry(
    label: string,
    repoPath: string,
    fn: () => Promise<void>
  ): Promise<void> {
    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      try {
        await fn();
        return;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? (error as any).stderr || error.message
            : String(error);

        const isNetwork = isGitNetworkError(error);

        if (attempt === this.MAX_ATTEMPTS || !isNetwork) {
          this.logger.error(
            `${label} failed in ${repoPath} after ${attempt} attempt(s)`,
            error as Error
          );
          throw new Error(`${label} failed: ${errorMessage}`);
        }

        const delay = attempt * this.RETRY_DELAY_MS;
        this.logger.warn(
          `${label} attempt ${attempt}/${this.MAX_ATTEMPTS} failed (network error): ${errorMessage}. ` +
            `Retrying in ${delay / 1000}s...`
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  async pull(repoPath: string): Promise<void> {
    this.logger.debug(`Running git pull --rebase in ${repoPath}`);
    await this.withRetry('git pull --rebase', repoPath, () =>
      execa('git', ['pull', '--rebase'], { cwd: repoPath }).then(() => void 0)
    );
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
    await this.withRetry('git push --force-with-lease', repoPath, () =>
      execa('git', ['push', '--force-with-lease'], { cwd: repoPath }).then(
        () => void 0
      )
    );
  }
}
