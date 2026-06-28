import type { UserAiMemory } from '@/lib/ai/memory';

export type EnergyLevel = 'low' | 'medium' | 'high';

const FOCUS_TIME_RANGES: Record<string, { start: number; end: number }> = {
  morning: { start: 6, end: 12 },
  afternoon: { start: 12, end: 17 },
  evening: { start: 17, end: 22 },
  night: { start: 20, end: 2 },
  chaos: { start: 0, end: 24 },
};

function hourInRange(hour: number, start: number, end: number): boolean {
  if (start <= end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}

/**
 * Infer cognitive energy from profile preference, local hour, and AI memory.
 * Replaces the manual LOW/MEDIUM/HIGH picker in autopilot mode.
 */
export function inferEnergyLevel(
  energyPreference: string | null | undefined,
  localHour: number,
  memory?: Pick<UserAiMemory, 'preferred_focus_windows' | 'planning_style'>
): EnergyLevel {
  const pref = energyPreference ?? 'morning';
  const range = FOCUS_TIME_RANGES[pref] ?? FOCUS_TIME_RANGES.morning;

  if (hourInRange(localHour, range.start, range.end)) {
    return 'high';
  }

  const memoryWindows = memory?.preferred_focus_windows ?? [];
  for (const window of memoryWindows) {
    const [startH] = window.start.split(':').map(Number);
    const [endH] = window.end.split(':').map(Number);
    if (hourInRange(localHour, startH, endH)) {
      return 'high';
    }
  }

  if (localHour >= 22 || localHour < 6) {
    return 'low';
  }

  if (localHour >= 13 && localHour < 15) {
    return 'low';
  }

  return 'medium';
}
