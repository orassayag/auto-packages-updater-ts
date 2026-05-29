import { injectable, inject } from 'inversify';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import latestVersion from 'latest-version';
import semver from 'semver';
import { TYPES } from '../constants/types.js';
import { ILogger } from '../interfaces/ILogger.js';
import {
  IPackageManagerService,
  PackageManager,
} from '../interfaces/IPackageManagerService.js';
import { OutdatedOutput } from '../schemas/outdated.schema.js';

@injectable()
export class PackageManagerService implements IPackageManagerService {
  constructor(@inject(TYPES.ILogger) private readonly logger: ILogger) {
    this.logger.setContext('PackageManagerService');
  }

  async detectPackageManager(repoPath: string): Promise<PackageManager> {
    this.logger.debug(`Detecting package manager in ${repoPath}`);
    const packageJsonPath = path.join(repoPath, 'package.json');
    const pnpmLockPath = path.join(repoPath, 'pnpm-lock.yaml');
    const packageLockPath = path.join(repoPath, 'package-lock.json');

    if (await fs.pathExists(pnpmLockPath)) {
      this.logger.debug(`Found pnpm-lock.yaml in ${repoPath}`);
      return 'pnpm';
    }

    if (await fs.pathExists(packageLockPath)) {
      this.logger.debug(`Found package-lock.json in ${repoPath}`);
      return 'npm';
    }

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.packageManager?.startsWith('pnpm')) {
        this.logger.debug(
          `Found pnpm via packageManager field in package.json in ${repoPath}`
        );
        return 'pnpm';
      }
    } catch (_error) {
      // Ignore
    }

    this.logger.debug(`Defaulting to npm for ${repoPath}`);
    return 'npm'; // Default to npm
  }

  async getOutdatedPackages(
    repoPath: string,
    _packageManager: PackageManager
  ): Promise<OutdatedOutput> {
    this.logger.debug(`Checking outdated packages in ${repoPath}`);
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      this.logger.warn(`package.json not found in ${repoPath}`);
      return {};
    }

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      const outdated: OutdatedOutput = {};
      const packageNames = Object.keys(dependencies);
      this.logger.debug(
        `Found ${packageNames.length} total dependencies in ${repoPath}`
      );

      await Promise.all(
        packageNames.map(async (pkgName) => {
          try {
            const currentRange = dependencies[pkgName];

            // Skip non-version dependencies (workspace, file, git, etc.)
            if (
              currentRange.startsWith('workspace:') ||
              currentRange.startsWith('file:') ||
              currentRange.startsWith('git+') ||
              currentRange.startsWith('github:') ||
              currentRange.startsWith('http')
            ) {
              return;
            }

            const latest = await latestVersion(pkgName);
            const minCurrent = semver.minVersion(currentRange)?.version;

            if (minCurrent && semver.gt(latest, minCurrent)) {
              outdated[pkgName] = {
                current: minCurrent,
                wanted: latest,
                latest: latest,
              };
              this.logger.debug(
                `Package ${pkgName} is outdated: ${minCurrent} -> ${latest}`
              );
            }
          } catch (error) {
            this.logger.debug(
              `Failed to check version for ${pkgName}: ${error instanceof Error ? error.message : String(error)}`
            );
            // Skip packages that fail to fetch (e.g., private packages without access)
          }
        })
      );

      return outdated;
    } catch (error: any) {
      this.logger.error(
        `Failed to check outdated packages in ${repoPath}`,
        error as Error
      );
      throw new Error(`Failed to check outdated packages: ${error.message}`);
    }
  }

  async install(
    repoPath: string,
    packageManager: PackageManager
  ): Promise<void> {
    const command = packageManager === 'npm' ? 'npm' : 'pnpm';
    const baseArgs =
      packageManager === 'npm'
        ? ['install', '--legacy-peer-deps']
        : [
            'install',
            '--no-strict-peer-dependencies',
            '--no-frozen-lockfile',
            '--fetch-retries',
            '5',
            '--fetch-retry-mintimeout',
            '10000',
            '--fetch-retry-maxtimeout',
            '60000',
            '--network-concurrency',
            '4',
          ];

    const maxAttempts = 3;
    const timeout = 10 * 60 * 1000; // 10 minutes

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.logger.info(
        `Running ${command} ${baseArgs.join(' ')} in ${repoPath} (Attempt ${attempt}/${maxAttempts})`
      );

      try {
        await execa(command, baseArgs, {
          cwd: repoPath,
          timeout,
          env: { ...process.env, CI: 'true' },
        });
        this.logger.debug(
          `${command} install completed successfully in ${repoPath}`
        );
        return;
      } catch (error: any) {
        const isNetworkError =
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ENOTFOUND') ||
          error.message?.includes('META_FETCH_FAIL') ||
          error.message?.includes('timed out');

        if (attempt === maxAttempts || !isNetworkError) {
          this.logger.error(
            `${command} install failed in ${repoPath} after ${attempt} attempts`,
            error as Error
          );
          throw new Error(
            `${command} install failed: ${error.stderr || error.message}`
          );
        }

        const delay = attempt * 5000;
        this.logger.warn(
          `[${command} install] Attempt ${attempt} failed (network error). Retrying in ${delay / 1000}s...`
        );
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  async ensureNpmrc(repoPath: string): Promise<void> {
    this.logger.debug(`Ensuring .npmrc with network settings in ${repoPath}`);
    const npmrcPath = path.join(repoPath, '.npmrc');
    const requiredSettings = [
      'fetch-retries=5',
      'fetch-retry-mintimeout=10000',
      'fetch-retry-maxtimeout=60000',
      'network-concurrency=4',
    ];

    try {
      const existing = (await fs.pathExists(npmrcPath))
        ? await fs.readFile(npmrcPath, 'utf-8')
        : '';

      const toAppend = requiredSettings.filter(
        (line) => !existing.includes(line.split('=')[0])
      );

      if (toAppend.length > 0) {
        const newContent = [existing.trim(), ...toAppend]
          .filter(Boolean)
          .join('\n');
        await fs.writeFile(npmrcPath, newContent + '\n');
        this.logger.debug(`Updated .npmrc in ${repoPath}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to update .npmrc in ${repoPath}`, error);
      // Don't throw here, as it's not a fatal error for the install process
    }
  }

  async updatePackageJson(
    repoPath: string,
    updates: Record<string, string>
  ): Promise<void> {
    this.logger.debug(
      `Updating package.json in ${repoPath} with ${Object.keys(updates).length} updates`
    );
    const packageJsonPath = path.join(repoPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    const updateSection = (section: string): void => {
      if (packageJson[section]) {
        for (const [pkg, version] of Object.entries(updates)) {
          if (packageJson[section][pkg]) {
            const currentVersion = packageJson[section][pkg];
            const prefix = currentVersion.startsWith('^')
              ? '^'
              : currentVersion.startsWith('~')
                ? '~'
                : '';
            packageJson[section][pkg] = `${prefix}${version}`;
            this.logger.debug(
              `Updated ${pkg} in ${section} to ${prefix}${version}`
            );
          }
        }
      }
    };

    updateSection('dependencies');
    updateSection('devDependencies');

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    this.logger.debug(`package.json written successfully in ${repoPath}`);
  }
}
