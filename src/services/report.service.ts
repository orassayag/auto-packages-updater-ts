import { injectable, inject } from 'inversify';
import fs from 'fs-extra';
import { formatInTimeZone } from 'date-fns-tz';
import { TYPES } from '../constants/types.js';
import { IReportService, IReportEntry } from '../interfaces/IReportService.js';
import { ILogger } from '../interfaces/ILogger.js';

@injectable()
export class ReportService implements IReportService {
  private entries: IReportEntry[] = [];
  private readonly REPORT_PATH =
    'C:\\Users\\Or Assayag\\Desktop\\PROJECTS_UPDATES_REPORT.txt';
  private readonly TIMEZONE = 'Asia/Jerusalem';

  constructor(@inject(TYPES.ILogger) private readonly logger: ILogger) {
    this.logger.setContext('ReportService');
  }

  addEntry(entry: IReportEntry): void {
    this.logger.debug(`Adding report entry for ${entry.repoName}`, {
      status: entry.status,
    });
    this.entries.push(entry);
  }

  getEntries(): IReportEntry[] {
    return this.entries;
  }

  async generateReport(startTime: Date): Promise<void> {
    const endTime = new Date();
    const totalDurationMs = endTime.getTime() - startTime.getTime();
    const totalDurationStr = this.formatDuration(totalDurationMs / 1000);
    const dateStr = formatInTimeZone(
      endTime,
      this.TIMEZONE,
      'dd/MM/yyyy HH:mm:ss'
    );

    let content = 'PROJECTS_UPDATES_REPORT\n';
    content += `Date: ${dateStr}\n`;
    content += `Execution Time: ${totalDurationStr}\n`;
    content += '==========================\n\n';

    for (const entry of this.entries) {
      content += `[${entry.status}] ${entry.repoName}`;
      if (entry.duration > 0) {
        content += ` (${this.formatDuration(entry.duration)})`;
      }
      content += '\n';

      if (entry.reason) {
        content += `  Reason: ${entry.reason}\n`;
      }

      if (entry.error) {
        content += `  Error: ${entry.error}\n`;
      }

      if (entry.details && entry.details.length > 0) {
        for (const detail of entry.details) {
          content += `  ${detail}\n`;
        }
      }
      content += '\n';
    }

    const totalUpdated = this.entries.filter(
      (e) => e.status === 'UPDATED'
    ).length;
    const totalFailed = this.entries.filter(
      (e) => e.status === 'FAILED'
    ).length;
    const totalSkipped = this.entries.filter(
      (e) => e.status === 'SKIPPED'
    ).length;

    // Sum of all updated packages across all repos
    const totalPackagesUpdated = this.entries.reduce(
      (acc, e) => acc + (e.status === 'UPDATED' ? e.details?.length || 0 : 0),
      0
    );

    content += '==========================\n';
    content += `Total packages updated: ${totalPackagesUpdated}\n`;
    content += `Total failed packages: ${totalFailed}\n`; // The example shows "Total failed packages" but it might mean failed repos or packages. I'll stick to failed repos as per the example numbers.
    content += `Total repos processed: ${this.entries.length}\n`;
    content += `Total repos updated: ${totalUpdated}\n`;
    content += `Total repos skipped: ${totalSkipped}\n`;
    content += `Total repos failed: ${totalFailed}\n`;
    content += `Execution time: ${totalDurationStr}\n`;

    try {
      this.logger.debug(`Writing report to ${this.REPORT_PATH}`);
      await fs.writeFile(this.REPORT_PATH, content, 'utf8');
      this.logger.info(`Report generated successfully at ${this.REPORT_PATH}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate report at ${this.REPORT_PATH}`,
        error as Error
      );
      throw error;
    }
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
}
