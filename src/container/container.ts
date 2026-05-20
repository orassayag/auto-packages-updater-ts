import { Container } from 'inversify';
import { TYPES } from '../constants/types.js';
import { IGitService } from '../interfaces/IGitService.js';
import { IPackageManagerService } from '../interfaces/IPackageManagerService.js';
import { IReportService } from '../interfaces/IReportService.js';
import { IValidationService } from '../interfaces/IValidationService.js';
import { IUpdaterService } from '../interfaces/IUpdaterService.js';
import { IRepoService } from '../interfaces/IRepoService.js';

import { GitService } from '../services/git.service.js';
import { PackageManagerService } from '../services/package-manager.service.js';
import { ReportService } from '../services/report.service.js';
import { ValidationService } from '../services/validation.service.js';
import { RepoService } from '../services/repo.service.js';
import { UpdaterService } from '../services/updater.service.js';

export const container = new Container();

container.bind<IGitService>(TYPES.IGitService).to(GitService);
container
  .bind<IPackageManagerService>(TYPES.IPackageManagerService)
  .to(PackageManagerService);
container
  .bind<IReportService>(TYPES.IReportService)
  .to(ReportService)
  .inSingletonScope();
container
  .bind<IValidationService>(TYPES.IValidationService)
  .to(ValidationService);
container.bind<IRepoService>(TYPES.IRepoService).to(RepoService);
container.bind<IUpdaterService>(TYPES.IUpdaterService).to(UpdaterService);
