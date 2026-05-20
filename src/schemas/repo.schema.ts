import { z } from 'zod';

const RepoSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export const ReposFileSchema = z.array(RepoSchema);
