'use client';

import { useMemo } from 'react';
import type { Task, TaskGroup, AITaskResponse } from '@/types/database';

/**
 * Groups tasks into smart categories using AI response data or a sensible fallback.
 * Fallback grouping uses date-based logic when AI is unavailable.
 */
export function useTaskGroups(tasks: Task[], aiResponse: AITaskResponse | null): TaskGroup[] {
  return useMemo(() => {
    const incompleteTasks = tasks.filter(t => !t.completed);

    if (aiResponse) {
      return buildAIGroups(incompleteTasks, aiResponse);
    }

    return buildFallbackGroups(incompleteTasks);
  }, [tasks, aiResponse]);
}

function buildAIGroups(tasks: Task[], ai: AITaskResponse): TaskGroup[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const used = new Set<string>();

  const todayFocus: Task[] = [];
  for (const id of ai.today_focus) {
    const t = taskMap.get(id);
    if (t) { todayFocus.push(t); used.add(id); }
  }

  const thisWeek: Task[] = [];
  for (const id of ai.this_week) {
    const t = taskMap.get(id);
    if (t && !used.has(id)) { thisWeek.push(t); used.add(id); }
  }

  const waiting: Task[] = [];
  for (const id of ai.waiting) {
    const t = taskMap.get(id);
    if (t && !used.has(id)) { waiting.push(t); used.add(id); }
  }

  // Remaining tasks go to "This Week"
  for (const t of tasks) {
    if (!used.has(t.id)) {
      thisWeek.push(t);
    }
  }

  const groups: TaskGroup[] = [];

  if (todayFocus.length > 0) {
    groups.push({
      id: 'today-focus',
      title: "Today's Focus",
      icon: 'flash',
      ai_generated: true,
      sort_order: 0,
      is_collapsed: false,
      tasks: todayFocus,
    });
  }

  if (thisWeek.length > 0) {
    groups.push({
      id: 'this-week',
      title: 'This Week',
      icon: 'calendar',
      ai_generated: true,
      sort_order: 1,
      is_collapsed: thisWeek.length > 5,
      tasks: thisWeek,
    });
  }

  if (waiting.length > 0) {
    groups.push({
      id: 'waiting',
      title: 'Waiting (No Rush)',
      icon: 'pause-circle',
      ai_generated: true,
      sort_order: 2,
      is_collapsed: true,
      tasks: waiting,
    });
  }

  return groups;
}

function buildFallbackGroups(tasks: Task[]): TaskGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayFocus: Task[] = [];
  const thisWeek: Task[] = [];
  const waiting: Task[] = [];

  // Sort by priority weight first
  const priorityWeight: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...tasks].sort((a, b) => {
    const pa = priorityWeight[a.priority] ?? 1;
    const pb = priorityWeight[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    // Then by due date (nulls last)
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  for (const task of sorted) {
    const dueDate = task.due_date ? new Date(task.due_date) : null;

    if (dueDate && dueDate <= today) {
      // Due today or past — focus
      todayFocus.push(task);
    } else if (task.priority === 'high') {
      todayFocus.push(task);
    } else if (dueDate && dueDate <= weekEnd) {
      thisWeek.push(task);
    } else if (task.priority === 'low' && !dueDate) {
      waiting.push(task);
    } else {
      thisWeek.push(task);
    }
  }

  // Cap today's focus at 5 — overflow to this week
  while (todayFocus.length > 5) {
    const overflow = todayFocus.pop()!;
    thisWeek.unshift(overflow);
  }

  const groups: TaskGroup[] = [];

  if (todayFocus.length > 0) {
    groups.push({
      id: 'today-focus',
      title: "Today's Focus",
      icon: 'flash',
      ai_generated: false,
      sort_order: 0,
      is_collapsed: false,
      tasks: todayFocus,
    });
  }

  if (thisWeek.length > 0) {
    groups.push({
      id: 'this-week',
      title: 'This Week',
      icon: 'calendar',
      ai_generated: false,
      sort_order: 1,
      is_collapsed: thisWeek.length > 5,
      tasks: thisWeek,
    });
  }

  if (waiting.length > 0) {
    groups.push({
      id: 'waiting',
      title: 'Waiting (No Rush)',
      icon: 'pause-circle',
      ai_generated: false,
      sort_order: 2,
      is_collapsed: true,
      tasks: waiting,
    });
  }

  // If no groups were created, put everything in "This Week"
  if (groups.length === 0 && tasks.length > 0) {
    groups.push({
      id: 'this-week',
      title: 'This Week',
      icon: 'calendar',
      ai_generated: false,
      sort_order: 0,
      is_collapsed: false,
      tasks,
    });
  }

  return groups;
}

