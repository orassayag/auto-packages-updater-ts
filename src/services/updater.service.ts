import { injectable, inject } from 'inversify';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { TYPES } from '../constants/types.js';
import { IUpdaterService } from '../interfaces/IUpdaterService.js';
import { IGitService } from '../interfaces/IGitService.js';
import { IPackageManagerService } from '../interfaces/IPackageManagerService.js';
import { IReportService } from '../interfaces/IReportService.js';
import { IValidationService } from '../interfaces/IValidationService.js';
import { IRepoService } from '../interfaces/IRepoService.js';
import { Repo } from '../schemas/repo.schema.js';

@injectable()
export class UpdaterService implements IUpdaterService {
  private readonly BASE_PATH = 'C:\\Or\\web\\projects';
  private readonly CURRENT_REPO_NAME = 'auto-packages-updater-ts';

  constructor(
    @inject(TYPES.IGitService) private readonly gitService: IGitService,
    @inject(TYPES.IPackageManagerService)
    private readonly packageManagerService: IPackageManagerService,
    @inject(TYPES.IReportService)
    private readonly reportService: IReportService,
    @inject(TYPES.IValidationService)
    private readonly validationService: IValidationService,
    @inject(TYPES.IRepoService) private readonly repoService: IRepoService
  ) {}

  /**
   * Runs the auto-package update process for all active repositories.
   */
  async run(): Promise<void> {
    const startTime = new Date();
    console.log(chalk.cyan('Starting Auto Packages Updater...\n'));

    try {
      await this.validationService.checkNetwork();

      let repos = await this.repoService.getActiveRepos();
      repos = this.sortRepos(repos);

      for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        await this.processRepo(repo, i + 1, repos.length);
      }

      await this.reportService.generateReport(startTime);
      console.log(
        chalk.green('\nProcess finished. Report generated on Desktop.')
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\nFatal error: ${errorMessage}`));
      process.exit(1);
    }
  }

  private sortRepos(repos: Repo[]): Repo[] {
    const otherRepos = repos.filter((r) => r.name !== this.CURRENT_REPO_NAME);
    const currentRepo = repos.find((r) => r.name === this.CURRENT_REPO_NAME);
    return currentRepo ? [...otherRepos, currentRepo] : otherRepos;
  }

  private async processRepo(
    repo: Repo,
    index: number,
    total: number
  ): Promise<void> {
    const repoPath = path.join(this.BASE_PATH, repo.name);
    const startTime = Date.now();
    const spinner = ora().start();

    const updateSpinner = (text: string): void => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      spinner.text = `[${chalk.blue(index)}/${chalk.blue(total)}] ${chalk.bold(repo.name)} (${elapsed}s) - ${text}`;
    };

    updateSpinner('Validating...');

    try {
      await this.validationService.validateRepo(repoPath);

      if (await this.gitService.hasUncommittedChanges(repoPath)) {
        spinner.warn(
          `[${index}/${total}] ${repo.name} - Skipped (Uncommitted changes)`
        );
        this.reportService.addEntry({
          repoName: repo.name,
          status: 'SKIPPED',
          duration: 0,
          reason: 'Uncommitted changes detected.',
        });
        return;
      }

      const pm =
        await this.packageManagerService.detectPackageManager(repoPath);

      updateSpinner(`Syncing (git pull)...`);
      await this.gitService.pull(repoPath);

      updateSpinner(`Checking for outdated packages...`);
      const outdated = await this.packageManagerService.getOutdatedPackages(
        repoPath,
        pm
      );

      const filteredUpdates: Record<string, string> = {};
      const updateDetails: string[] = [];

      for (const [pkg, info] of Object.entries(outdated)) {
        if (this.shouldSkipPackage(info.latest)) continue;

        filteredUpdates[pkg] = info.latest;
        updateDetails.push(
          `${pkg} ${info.current || 'unknown'} -> ${info.latest}`
        );
      }

      if (updateDetails.length === 0) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        spinner.succeed(
          `[${index}/${total}] ${repo.name} (${duration}s) - No updates found`
        );
        this.reportService.addEntry({
          repoName: repo.name,
          status: 'NO UPDATES',
          duration,
          details: ['No outdated packages found.'],
        });
        return;
      }

      // Display outdated packages in console as per requirement
      spinner.stop();
      console.log(
        `[${chalk.blue(index)}/${chalk.blue(total)}] ${chalk.bold(repo.name)}`
      );
      updateDetails.forEach((d) => console.log(`  ${chalk.yellow(d)}`));
      spinner.start();

      updateSpinner(`Updating package.json...`);
      await this.packageManagerService.updatePackageJson(
        repoPath,
        filteredUpdates
      );

      updateSpinner(`Installing dependencies (${pm})...`);
      await this.packageManagerService.install(repoPath, pm);

      updateSpinner(`Committing and pushing...`);
      await this.gitService.add(repoPath);
      await this.gitService.commit(repoPath, 'Update outdated packages');
      await this.gitService.push(repoPath);

      const duration = Math.floor((Date.now() - startTime) / 1000);
      spinner.succeed(
        `[${index}/${total}] ${repo.name} (${duration}s) - Updated ${updateDetails.length} packages`
      );

      this.reportService.addEntry({
        repoName: repo.name,
        status: 'UPDATED',
        duration,
        details: updateDetails,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const duration = Math.floor((Date.now() - startTime) / 1000);
      spinner.fail(`[${index}/${total}] ${repo.name} (${duration}s) - Failed`);
      console.error(chalk.red(`  Error: ${errorMessage}`));

      this.reportService.addEntry({
        repoName: repo.name,
        status: 'FAILED',
        duration,
        error: errorMessage,
      });
    }
  }

  private shouldSkipPackage(version: string): boolean {
    return (
      version.startsWith('workspace:') ||
      version.startsWith('file:') ||
      version.startsWith('git+') ||
      version.startsWith('github:')
    );
  }
}
