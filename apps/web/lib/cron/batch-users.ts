import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

/** Max users per cron DB page — keeps `IN (...)` lists and memory bounded. */
export const CRON_USER_BATCH_SIZE = 200;

/** Max concurrent AI-heavy auto-plan jobs per batch. */
export const AUTO_PLAN_CONCURRENCY = 5;

type UserQuery = ReturnType<SupabaseClient<Database>['from']>;

export type UserBatchFilter = (
  query: UserQuery
) => UserQuery;

/**
 * Page through `users` in fixed-size batches for cron sweeps.
 * Returns total rows visited.
 */
export async function forEachUserBatch<T extends { id: string }>(
  supabase: SupabaseClient<Database>,
  select: string,
  handler: (users: T[], batchIndex: number) => Promise<void>,
  options?: {
    batchSize?: number;
    filter?: UserBatchFilter;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<number> {
  const batchSize = options?.batchSize ?? CRON_USER_BATCH_SIZE;
  let offset = 0;
  let total = 0;
  let batchIndex = 0;

  while (true) {
    let query = supabase.from('users').select(select).range(offset, offset + batchSize - 1);

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    } else {
      query = query.order('id', { ascending: true });
    }

    if (options?.filter) {
      query = options.filter(query);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const batch = (data ?? []) as unknown as T[];
    if (batch.length === 0) {
      break;
    }

    await handler(batch, batchIndex);
    total += batch.length;
    batchIndex += 1;

    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return total;
}

/** Run async work over items with a fixed concurrency limit. */
export async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;
  const poolSize = Math.min(concurrency, items.length);

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
}
