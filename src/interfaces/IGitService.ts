export interface IGitService {
  pull(repoPath: string): Promise<void>;
  getStatus(repoPath: string): Promise<string>;
  hasUncommittedChanges(repoPath: string): Promise<boolean>;
  add(repoPath: string): Promise<void>;
  commit(repoPath: string, message: string): Promise<void>;
  push(repoPath: string): Promise<void>;
}
