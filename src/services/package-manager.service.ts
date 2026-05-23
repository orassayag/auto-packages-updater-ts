import { injectable } from 'inversify';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import {
  IPackageManagerService,
  PackageManager,
} from '../interfaces/IPackageManagerService.js';
import {
  OutdatedOutput,
  OutdatedOutputSchema,
} from '../schemas/outdated.schema.js';

@injectable()
export class PackageManagerService implements IPackageManagerService {
  async detectPackageManager(repoPath: string): Promise<PackageManager> {
    const packageJsonPath = path.join(repoPath, 'package.json');
    const pnpmLockPath = path.join(repoPath, 'pnpm-lock.yaml');
    const packageLockPath = path.join(repoPath, 'package-lock.json');

    if (await fs.pathExists(pnpmLockPath)) {
      return 'pnpm';
    }

    if (await fs.pathExists(packageLockPath)) {
      return 'npm';
    }

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.packageManager?.startsWith('pnpm')) {
        return 'pnpm';
      }
    } catch (_error) {
      // Ignore
    }

    return 'npm'; // Default to npm
  }

  async getOutdatedPackages(
    repoPath: string,
    packageManager: PackageManager
  ): Promise<OutdatedOutput> {
    const command = packageManager === 'npm' ? 'npm' : 'pnpm';
    const args = ['outdated', '--json'];

    try {
      const { stdout } = await execa(command, args, {
        cwd: repoPath,
        reject: false,
        env: { ...process.env, CI: 'true' },
      });
      if (!stdout || stdout.trim() === '') {
        return {};
      }

      try {
        const rawJson = JSON.parse(stdout);
        return OutdatedOutputSchema.parse(rawJson);
      } catch (parseError: any) {
        throw new Error(
          `Failed to parse ${command} outdated JSON output. Output starts with: ${stdout.substring(0, 100)}...`
        );
      }
    } catch (error: any) {
      throw error;
    }
  }

  async install(
    repoPath: string,
    packageManager: PackageManager
  ): Promise<void> {
    const command = packageManager === 'npm' ? 'npm' : 'pnpm';
    const args =
      packageManager === 'npm'
        ? ['install', '--legacy-peer-deps']
        : ['install', '--no-strict-peer-dependencies', '--no-frozen-lockfile'];

    try {
      await execa(command, args, {
        cwd: repoPath,
        timeout: 120000,
        env: { ...process.env, CI: 'true' },
      });
    } catch (error: any) {
      throw new Error(
        `${command} install failed: ${error.stderr || error.message}`
      );
    }
  }

  async updatePackageJson(
    repoPath: string,
    updates: Record<string, string>
  ): Promise<void> {
    const packageJsonPath = path.join(repoPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    const updateSection = (section: string): void => {
      if (packageJson[section]) {
        for (const [pkg, version] of Object.entries(updates)) {
          if (packageJson[section][pkg]) {
            // Keep the prefix if it exists (e.g., ^, ~) or just use the latest version
            // The plan says "update their versions directly in package.json", usually meaning ^latest
            // But usually we just put the version. Let's use ^ as a default or match existing.
            const currentVersion = packageJson[section][pkg];
            const prefix = currentVersion.startsWith('^')
              ? '^'
              : currentVersion.startsWith('~')
                ? '~'
                : '';
            packageJson[section][pkg] = `${prefix}${version}`;
          }
        }
      }
    };

    updateSection('dependencies');
    updateSection('devDependencies');

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
}
