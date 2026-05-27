import 'reflect-metadata';
import { container } from './container/container.js';
import { TYPES } from './constants/types.js';
import { IUpdaterService } from './interfaces/IUpdaterService.js';
import { ILogger } from './interfaces/ILogger.js';

async function bootstrap(): Promise<void> {
  const logger = container.get<ILogger>(TYPES.ILogger);
  logger.setContext('Bootstrap');

  try {
    logger.info('Bootstrapping application...');
    const updater = container.get<IUpdaterService>(TYPES.IUpdaterService);
    await updater.run();
  } catch (error) {
    logger.error('Fatal error during bootstrap', error as Error);
    console.error('Fatal error during bootstrap:', error);
    process.exit(1);
  }
}

void bootstrap();
