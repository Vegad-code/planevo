// Plan Pilot — Task Helper Utilities
// Priority colors, time-of-day icons, and formatting helpers

import type { TaskPriority, BestTimeOfDay, EnergyLevel } from '@/types/database';

// Priority color bar mappings (CSS colors)
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: '#FF6B6B',
  medium: '#4ECDC4',
  low: '#95E1D3',
};

// Time-of-day display info
export const TIME_OF_DAY_INFO: Record<BestTimeOfDay, { emoji: string; label: string }> = {
  morning: { emoji: '☀️', label: 'Morning' },
  afternoon: { emoji: '🌤️', label: 'Afternoon' },
  evening: { emoji: '🌙', label: 'Evening' },
  anytime: { emoji: '🕐', label: 'Anytime' },
};

// Energy level display info
export const ENERGY_INFO: Record<EnergyLevel, { label: string; color: string }> = {
  low: { label: 'Low Energy', color: '#95E1D3' },
  medium: { label: 'Medium Energy', color: '#4ECDC4' },
  high: { label: 'High Energy', color: '#FF6B6B' },
};

// Format estimated minutes into human-readable string
export function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

// Format due date relative to today
export function formatDueDate(dateString: string | null): string | null {
  if (!dateString) return null;
  const due = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays}d`;
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Check if a date is overdue (but we won't show it aggressively — shame-free!)
export function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

// Encouraging messages for task completion
export const COMPLETION_MESSAGES = [
  'Nice work! 🌱',
  'You got this! ⚡',
  'One step closer! 🎉',
  'Crushed it! 🌱',
  'Keep growing! 🌱',
  'Way to go! ⚡',
  'Making progress! 🎉',
];

export function getRandomCompletionMessage(): string {
  return COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
}

// Reschedule encouragement messages
export const RESCHEDULE_MESSAGES = [
  "No problem! Let's find a better time for this.",
  "Totally fine — timing matters. Let's reschedule.",
  "Smart move. A better time means a better result.",
  "Flexibility is a strength! Let's pick a new time.",
];

export function getRandomRescheduleMessage(): string {
  return RESCHEDULE_MESSAGES[Math.floor(Math.random() * RESCHEDULE_MESSAGES.length)];
}

// Get the current time-of-day bucket
export function getCurrentTimeOfDay(): BestTimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'anytime';
}
