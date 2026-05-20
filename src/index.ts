import 'reflect-metadata';
import { container } from './container/container.js';
import { TYPES } from './constants/types.js';
import { IUpdaterService } from './interfaces/IUpdaterService.js';

async function bootstrap(): Promise<void> {
  try {
    const updater = container.get<IUpdaterService>(TYPES.IUpdaterService);
    await updater.run();
  } catch (error) {
    console.error('Fatal error during bootstrap:', error);
    process.exit(1);
  }
}

void bootstrap();
