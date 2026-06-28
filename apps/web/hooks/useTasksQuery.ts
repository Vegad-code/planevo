'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';
import type { Task } from '@/types/tasks';
import { useUserProfileOptional } from '@/components/providers/UserProfileProvider';

async function fetchTasksForUser(userId: string): Promise<Task[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data: sourceItems } = await supabase
    .from('source_items')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  let allTasks: Task[] = [];
  if (data) allTasks = [...(data as Task[])];

  if (sourceItems) {
    const mappedSources = sourceItems.map((item) => ({
      id: item.external_id,
      user_id: item.user_id,
      title: item.title || 'Untitled',
      description: item.description,
      due_date: item.due_date,
      priority: 'medium' as const,
      estimated_minutes: 30,
      completed: false,
      completed_at: null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      deleted_at: null,
      external_id: item.external_id,
      external_url: item.url,
      best_time_of_day: 'anytime' as const,
      energy_level_required: 'medium' as const,
      is_recurring: false,
      recurrence_pattern: null,
      parent_task_id: null,
      provider: item.provider,
    })) as Task[];
    allTasks = [...allTasks, ...mappedSources];
  }

  return allTasks;
}

export function useTasksQuery() {
  const profile = useUserProfileOptional();
  const userId = profile?.userId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userId ? queryKeys.tasks(userId) : ['tasks', 'anonymous'],
    queryFn: () => fetchTasksForUser(userId!),
    enabled: Boolean(userId),
  });

  const invalidate = useCallback(() => {
    if (!userId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
  }, [queryClient, userId]);

  useEffect(() => {
    const onChange = () => invalidate();
    window.addEventListener('planevo:tasks-changed', onChange);
    return () => window.removeEventListener('planevo:tasks-changed', onChange);
  }, [invalidate]);

  const setTasks = useCallback(
    (updater: Task[] | ((prev: Task[]) => Task[])) => {
      if (!userId) return;
      queryClient.setQueryData<Task[]>(queryKeys.tasks(userId), (prev) => {
        const current = prev ?? [];
        return typeof updater === 'function' ? updater(current) : updater;
      });
    },
    [queryClient, userId]
  );

  return {
    tasks: query.data ?? [],
    loading: query.isLoading,
    refresh: invalidate,
    setTasks,
    queryClient,
    userId,
  };
}

export { fetchTasksForUser };
