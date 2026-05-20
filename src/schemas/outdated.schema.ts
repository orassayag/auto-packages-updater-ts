import { z } from 'zod';

const OutdatedPackageSchema = z.object({
  current: z.string().optional(), // NPM might return undefined if not installed
  wanted: z.string(),
  latest: z.string(),
  dependent: z.string().optional(),
  location: z.string().optional(),
});

export const OutdatedOutputSchema = z.record(z.string(), OutdatedPackageSchema);

export type OutdatedOutput = z.infer<typeof OutdatedOutputSchema>;
