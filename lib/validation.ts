import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
});

export function parsePagination(params: URLSearchParams) {
  const obj = {
    limit: params.get('limit') ?? undefined,
    offset: params.get('offset') ?? undefined,
    search: params.get('search') ?? undefined,
  };
  return paginationSchema.safeParse(obj);
}

export function parseSort<T extends readonly string[]>(
  params: URLSearchParams,
  allowed: T,
  defaultBy: T[number],
  defaultDir: 'asc' | 'desc' = 'desc'
) {
  const sortBy = params.get('sortBy') ?? defaultBy;
  const sortDir = params.get('sortDir') ?? defaultDir;
  const schema = z.object({
    sortBy: z.enum([...allowed] as unknown as [T[number], ...T[number][]]),
    sortDir: z.enum(['asc', 'desc']),
  });
  return schema.safeParse({ sortBy, sortDir });
}
