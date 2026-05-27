import { injectable, inject } from 'inversify';
import fs from 'fs-extra';
import { TYPES } from '../constants/types.js';
import { IRepoService } from '../interfaces/IRepoService.js';
import { ILogger } from '../interfaces/ILogger.js';
import { Repo, ReposFileSchema } from '../schemas/repo.schema.js';

@injectable()
export class RepoService implements IRepoService {
  private readonly CONFIG_PATH = 'C:\\Or\\web\\project-repos-names.json';

  constructor(@inject(TYPES.ILogger) private readonly logger: ILogger) {
    this.logger.setContext('RepoService');
  }

  async getActiveRepos(): Promise<Repo[]> {
    this.logger.debug(`Loading repositories from config: ${this.CONFIG_PATH}`);
    if (!(await fs.pathExists(this.CONFIG_PATH))) {
      this.logger.error(`Config file not found at ${this.CONFIG_PATH}`);
      throw new Error(`Config file not found at ${this.CONFIG_PATH}`);
    }

    try {
      const content = await fs.readJson(this.CONFIG_PATH);
      this.logger.debug(`Config file loaded. Validating schema...`);
      const validated = ReposFileSchema.parse(content);
      const activeRepos = validated.filter((repo) => repo.type === 'active');

      if (activeRepos.length === 0) {
        this.logger.warn('No active repositories found in config file.');
        throw new Error('No active repos found in config file.');
      }

      this.logger.info(`Found ${activeRepos.length} active repositories.`);
      return activeRepos;
    } catch (error) {
      this.logger.error(
        'Failed to load or validate repositories config',
        error as Error
      );
      if (error instanceof Error) {
        throw new Error(`Failed to load repos: ${error.message}`);
      }
      throw error;
    }
  }
}
