import { injectable } from 'inversify';
import fs from 'fs-extra';
import { IRepoService } from '../interfaces/IRepoService.js';
import { Repo, ReposFileSchema } from '../schemas/repo.schema.js';

@injectable()
export class RepoService implements IRepoService {
  private readonly CONFIG_PATH = 'C:\\Or\\web\\project-repos-names.json';

  async getActiveRepos(): Promise<Repo[]> {
    if (!(await fs.pathExists(this.CONFIG_PATH))) {
      throw new Error(`Config file not found at ${this.CONFIG_PATH}`);
    }

    try {
      const content = await fs.readJson(this.CONFIG_PATH);
      const validated = ReposFileSchema.parse(content);
      const activeRepos = validated.filter((repo) => repo.type === 'active');

      if (activeRepos.length === 0) {
        throw new Error('No active repos found in config file.');
      }

      return activeRepos;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load repos: ${error.message}`);
      }
      throw error;
    }
  }
}
