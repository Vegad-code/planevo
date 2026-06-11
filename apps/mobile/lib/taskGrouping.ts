export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'critical' | null;
  estimated_minutes?: number | null;
  completed: boolean;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  external_id?: string | null;
  external_url?: string | null;
  provider?: string | null;
  [key: string]: any;
}

export interface TaskGroup {
  id: string;
  title: string;
  icon: string;
  ai_generated: boolean;
  sort_order: number;
  is_collapsed: boolean;
  tasks: Task[];
}

export function buildFallbackGroups(tasks: Task[]): TaskGroup[] {
  const incompleteTasks = tasks.filter(t => !t.completed);

  if (incompleteTasks.length === 0 && tasks.length > 0) {
    return [{
      id: 'completed-tasks',
      title: 'Completed Recently',
      icon: 'check-circle',
      ai_generated: false,
      sort_order: 10,
      is_collapsed: true,
      tasks: tasks.filter(t => t.completed).slice(0, 10),
    }];
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayFocus: Task[] = [];
  const thisWeek: Task[] = [];
  const waiting: Task[] = [];

  const priorityWeight: Record<string, number> = { critical: -1, high: 0, medium: 1, low: 2 };
  const sorted = [...incompleteTasks].sort((a, b) => {
    const pa = a.priority ? priorityWeight[a.priority] ?? 1 : 1;
    const pb = b.priority ? priorityWeight[b.priority] ?? 1 : 1;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  for (const task of sorted) {
    const dueDate = task.due_date ? new Date(task.due_date) : null;

    if (dueDate && dueDate <= today) {
      todayFocus.push(task);
    } else if (task.priority === 'high' || task.priority === 'critical') {
      todayFocus.push(task);
    } else if (dueDate && dueDate <= weekEnd) {
      thisWeek.push(task);
    } else if (task.priority === 'low' && !dueDate) {
      waiting.push(task);
    } else {
      thisWeek.push(task);
    }
  }

  while (todayFocus.length > 5) {
    const overflow = todayFocus.pop()!;
    thisWeek.unshift(overflow);
  }

  const groups: TaskGroup[] = [];

  if (todayFocus.length > 0) {
    groups.push({
      id: 'today-focus',
      title: "Focus/Urgent",
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
      title: 'Up Next',
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
      title: 'Backlog/Sometime',
      icon: 'pause-circle',
      ai_generated: false,
      sort_order: 2,
      is_collapsed: true,
      tasks: waiting,
    });
  }

  if (groups.length === 0 && incompleteTasks.length > 0) {
    groups.push({
      id: 'this-week',
      title: 'Up Next',
      icon: 'calendar',
      ai_generated: false,
      sort_order: 0,
      is_collapsed: false,
      tasks: incompleteTasks,
    });
  }

  return groups;
}
