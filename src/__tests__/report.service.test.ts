import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';
import { ReportService } from '../services/report.service.js';
import { createMockLogger } from './mocks/logger.mock.js';

vi.mock('fs-extra');
vi.mock('date-fns-tz', () => ({
  formatInTimeZone: (): string => '20/05/2026 15:00:00',
}));

describe('ReportService', () => {
  let reportService: ReportService;

  beforeEach((): void => {
    reportService = new ReportService(createMockLogger());
    vi.clearAllMocks();
  });

  it('should add entries and generate report', async (): Promise<void> => {
    reportService.addEntry({
      repoName: 'repo1',
      status: 'UPDATED',
      duration: 10,
      details: ['pkg 1 -> 2'],
    });

    reportService.addEntry({
      repoName: 'repo2',
      status: 'FAILED',
      duration: 5,
      error: 'some error',
    });

    reportService.addEntry({
      repoName: 'repo3',
      status: 'SKIPPED',
      duration: 0,
      reason: 'some reason',
    });

    await reportService.generateReport(new Date());

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('PROJECTS_UPDATES_REPORT.txt'),
      expect.stringContaining('[UPDATED] repo1'),
      'utf8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Error: some error'),
      'utf8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Reason: some reason'),
      'utf8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Total repos updated: 1'),
      'utf8'
    );
  });
});
