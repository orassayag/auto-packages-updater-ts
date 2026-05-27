import { injectable, inject } from 'inversify';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import { TYPES } from '../constants/types.js';
import { IValidationService } from '../interfaces/IValidationService.js';
import { ILogger } from '../interfaces/ILogger.js';

@injectable()
export class ValidationService implements IValidationService {
  constructor(@inject(TYPES.ILogger) private readonly logger: ILogger) {
    this.logger.setContext('ValidationService');
  }

  async checkNetwork(): Promise<void> {
    this.logger.debug('Pinging NPM registry...');
    try {
      await execa('npm', ['ping'], { timeout: 10000 });
      this.logger.debug('NPM registry is reachable.');
    } catch (error) {
      this.logger.error('NPM registry is unreachable', error as Error);
      throw new Error(
        'NPM registry is unreachable. Please check your internet connection.'
      );
    }
  }

  async validateRepo(repoPath: string): Promise<void> {
    this.logger.debug(`Validating repository at ${repoPath}`);
    if (!(await fs.pathExists(repoPath))) {
      this.logger.error(`Repo directory not found at ${repoPath}`);
      throw new Error(`Repo directory not found at ${repoPath}`);
    }

    const packageJsonPath = path.join(repoPath, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      this.logger.error(`package.json not found in repo root: ${repoPath}`);
      throw new Error('package.json not found in repo root');
    }
    this.logger.debug(`Repository at ${repoPath} is valid.`);
  }
}
