import { z } from 'zod';

export const RepoSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export type Repo = z.infer<typeof RepoSchema>;

export const ReposFileSchema = z.array(RepoSchema);
