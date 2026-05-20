import { Repo } from '../schemas/repo.schema.js';

/**
 * Service for managing the list of repositories to process.
 */
export interface IRepoService {
  /**
   * Retrieves all active repositories from the configuration.
   */
  getActiveRepos(): Promise<Repo[]>;
}
