import {z} from 'zod';

// Parse only the fields we actually render. The GitHub search response is
// large (100 repos × dozens of fields); dropping the rest keeps a search
// page lean in memory and forces us to notice when a field we depend on
// is missing at the boundary rather than deep inside a component.

export const ownerSchema = z.object({
  login: z.string(),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
});

export const repositorySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  // GitHub returns `language: null` for repos with no detectable language.
  language: z.string().nullable(),
  updated_at: z.string(),
  html_url: z.string().url(),
  owner: ownerSchema,
});

export const searchResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(repositorySchema),
});

// Detail endpoint returns the same shape plus a few extras we only need
// on the detail screen. Kept separate so the list stays minimal.
export const repositoryDetailSchema = repositorySchema.extend({
  subscribers_count: z.number().optional(),
  license: z
    .object({
      spdx_id: z.string().nullable(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  topics: z.array(z.string()).optional(),
  default_branch: z.string().optional(),
});

export type Owner = z.infer<typeof ownerSchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type RepositoryDetail = z.infer<typeof repositoryDetailSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
