/**
 * Momentum & Balance Metrics
 * 
 * These stats power the dashboard's 4-metric row:
 *   1. Focus Time     – total seconds spent in Deep Work today
 *   2. Tasks Crushed  – tasks completed today / tasks planned today
 *   3. Upcoming Deadlines – tasks due in the next 3 days
 *   4. Consistency    – % of active days in the last 7 days
 */

export interface DailyMetric {
  date: string;
  focus_time_seconds: number;
  tasks_completed: number;
  tasks_planned: number;
}

export interface MomentumStats {
  focusTimeMinutes: number;
  tasksCrushed: number;
  tasksPlanned: number;
  upcomingDeadlines: number;
  consistencyPercent: number;
}

/**
 * Calculate the Momentum & Balance stats from the last 7 days of daily metrics
 * and a count of upcoming deadlines.
 */
export function calculateMomentumStats(
  metrics: DailyMetric[],
  upcomingDeadlineCount: number,
  tasksPlannedToday: number
): MomentumStats {
  const todayStr = new Date().toISOString().split('T')[0];

  // Find today's row
  const todayMetric = metrics.find(m => m.date === todayStr);

  const focusTimeMinutes = todayMetric
    ? Math.round(todayMetric.focus_time_seconds / 60)
    : 0;

  const tasksCrushed = todayMetric?.tasks_completed ?? 0;
  const tasksPlanned = tasksPlannedToday; // Use dynamically calculated value instead of static column

  // Consistency: how many of the last 7 days had at least 1 task completed OR focus time > 0
  const activeDays = metrics.filter(
    m => m.tasks_completed > 0 || m.focus_time_seconds > 0
  ).length;
  const consistencyPercent = Math.round((activeDays / 7) * 100);

  return {
    focusTimeMinutes,
    tasksCrushed,
    tasksPlanned,
    upcomingDeadlines: upcomingDeadlineCount,
    consistencyPercent,
  };
}

// Legacy type kept for backwards compat with any imports
export interface UserStats {
  currentStreak: number;
  consistencyScore: number;
  totalCompleted: number;
}

/** @deprecated Use calculateMomentumStats instead */
export function calculateUserStats(tasks: { completed: boolean; completed_at?: string | null }[]): UserStats {
  const completedTasks = tasks
    .filter(t => t.completed && t.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  if (completedTasks.length === 0) {
    return { currentStreak: 0, consistencyScore: 0, totalCompleted: 0 };
  }

  const completedDates = Array.from(new Set(
    completedTasks.map(t => new Date(t.completed_at!).toLocaleDateString())
  ));

  let streak = 0;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const todayStr = today.toLocaleDateString();
  const yesterdayStr = yesterday.toLocaleDateString();

  if (completedDates[0] !== todayStr && completedDates[0] !== yesterdayStr) {
    streak = 0;
  } else {
    for (let i = 0; i < completedDates.length; i++) {
      const current = new Date(completedDates[i]);
      const expected = new Date();
      expected.setDate(today.getDate() - (completedDates[0] === todayStr ? i : i + 1));
      
      if (current.toLocaleDateString() === expected.toLocaleDateString()) {
        streak++;
      } else {
        break;
      }
    }
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const activeDaysInLast7 = completedDates.filter(dateStr => {
    const d = new Date(dateStr);
    return d >= sevenDaysAgo;
  }).length;

  const consistencyScore = Math.round((activeDaysInLast7 / 7) * 100);

  return {
    currentStreak: streak,
    consistencyScore,
    totalCompleted: completedTasks.length
  };
}
