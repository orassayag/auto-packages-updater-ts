import { OutdatedOutput } from '../schemas/outdated.schema.js';

/**
 * Supported package managers.
 */
export type PackageManager = 'npm' | 'pnpm';

/**
 * Service for interacting with package managers (NPM/PNPM).
 */
export interface IPackageManagerService {
  /**
   * Detects which package manager is used in the given repository.
   * @param repoPath Path to the repository.
   */
  detectPackageManager(repoPath: string): Promise<PackageManager>;

  /**
   * Gets a list of outdated packages for the given repository.
   * @param repoPath Path to the repository.
   * @param packageManager The package manager to use.
   */
  getOutdatedPackages(
    repoPath: string,
    packageManager: PackageManager
  ): Promise<OutdatedOutput>;

  /**
   * Installs dependencies in the given repository.
   * @param repoPath Path to the repository.
   * @param packageManager The package manager to use.
   */
  install(repoPath: string, packageManager: PackageManager): Promise<void>;

  /**
   * Runs the repo's lint/typecheck/build/test scripts (or the list in
   * package.json autoPackagesUpdater.verify) and throws on the first failure.
   * @param repoPath Path to the repository.
   * @param packageManager The package manager to use.
   */
  verify(repoPath: string, packageManager: PackageManager): Promise<void>;

  /**
   * Ensures .npmrc exists with network resilience settings for pnpm.
   * @param repoPath Path to the repository.
   */
  ensureNpmrc(repoPath: string): Promise<void>;

  /**
   * Updates package.json with the provided package versions.
   * @param repoPath Path to the repository.
   * @param updates Record of package names and their new versions.
   */
  updatePackageJson(
    repoPath: string,
    updates: Record<string, string>
  ): Promise<void>;

  /**
   * Cleans pnpm-workspace.yaml from stale supply-chain exclusions.
   * @param repoPath Path to the repository.
   */
  cleanPnpmWorkspaceExclusions(repoPath: string): Promise<void>;
}
