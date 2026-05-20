import { injectable } from 'inversify';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import { IValidationService } from '../interfaces/IValidationService.js';

@injectable()
export class ValidationService implements IValidationService {
  async checkNetwork(): Promise<void> {
    try {
      await execa('npm', ['ping'], { timeout: 10000 });
    } catch (_error) {
      throw new Error(
        'NPM registry is unreachable. Please check your internet connection.'
      );
    }
  }

  async validateRepo(repoPath: string): Promise<void> {
    if (!(await fs.pathExists(repoPath))) {
      throw new Error(`Repo directory not found at ${repoPath}`);
    }

    const packageJsonPath = path.join(repoPath, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      throw new Error('package.json not found in repo root');
    }
  }
}
