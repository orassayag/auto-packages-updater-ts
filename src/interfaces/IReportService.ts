export interface IReportEntry {
  repoName: string;
  status: 'UPDATED' | 'FAILED' | 'SKIPPED' | 'NO UPDATES';
  duration: number; // in seconds
  details?: string[];
  error?: string;
  reason?: string;
}

export interface IReportService {
  addEntry(entry: IReportEntry): void;
  generateReport(startTime: Date): Promise<void>;
  getEntries(): IReportEntry[];
}
