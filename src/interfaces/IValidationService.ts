export interface IValidationService {
  checkNetwork(): Promise<void>;
  validateRepo(repoPath: string): Promise<void>;
}
