import { Task } from '@/types/database';

export interface UserStats {
  currentStreak: number;
  consistencyScore: number; // 0-100
  totalCompleted: number;
}

export function calculateUserStats(tasks: Task[]): UserStats {
  const completedTasks = tasks
    .filter(t => t.completed && t.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  if (completedTasks.length === 0) {
    return { currentStreak: 0, consistencyScore: 0, totalCompleted: 0 };
  }

  // Calculate streak
  const completedDates = new Array(...new Set(
    completedTasks.map(t => new Date(t.completed_at!).toLocaleDateString())
  ));

  let streak = 0;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const todayStr = today.toLocaleDateString();
  const yesterdayStr = yesterday.toLocaleDateString();

  // If haven't completed anything today OR yesterday, streak is 0
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

  // Calculate consistency score (rolling 7 days)
  // Logic: (Days with at least 1 task completed in last 7 days / 7) * 100
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
