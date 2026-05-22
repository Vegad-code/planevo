/**
 * Planevo Agentic Scheduler v1
 * 
 * A constraint-aware scheduler that places tasks around "Hard Blocks" (School, Work)
 * and "Fixed Events" (Calendar). Designed for the "Ultimate" visual timeline.
 */

import { addMinutes, format, parseISO, isAfter, isBefore, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

export interface UnavailableBlock {
  label: string;
  start: string; // "08:00"
  end: string;   // "15:00"
  days: string[]; // ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}

export interface SchedulingPreferences {
  unavailable_blocks: UnavailableBlock[];
  preferred_focus_time: 'morning' | 'afternoon' | 'evening';
  pomodoro_length: number; // minutes
  break_length: number;    // minutes
  sleep_start: string;     // "22:00"
  sleep_end: string;       // "07:00"
}

export interface ScheduleBlock {
  id: string;
  time: string;
  startTime: Date;
  endTime: Date;
  title: string;
  type: 'focus' | 'break' | 'event' | 'constraint' | 'buffer';
  duration: number; // minutes
  description: string;
  specific_action?: string;
  success_condition?: string;
  why_now?: string;
  fallback_if_stuck?: string;
  materials_needed?: string[];
  break_reason?: string;
  originalTitle?: string; // Raw task name
  taskId?: string; // If linked to a DB task
  externalUrl?: string; // Canvas or other external links
  status?: 'pending' | 'confirmed' | 'rejected';
  is_ai_suggested?: boolean;
}

export interface AgenticSchedulerInput {
  tasks: Array<{
    id?: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    estimated_minutes?: number;
    description?: string;
    external_url?: string;
  }>;
  calendarEvents: Array<{
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
  }>;
  preferences: SchedulingPreferences;
  date: Date;
}

/**
 * Creates a schedule by identifying "Hard Constraints" first,
 * then filling the gaps with tasks based on energy and priority.
 */
export function generateAgenticSchedule(input: AgenticSchedulerInput): ScheduleBlock[] {
  const { tasks = [], calendarEvents = [], preferences, date } = input;
  const schedule: ScheduleBlock[] = [];
  const dayStart = startOfDay(date);
  
  // 1. Generate Hard Constraints (Sleep, School)
  const currentDayName = format(date, 'EEEE');
  const unavailableBlocks = preferences?.unavailable_blocks || [];
  const constraints = unavailableBlocks
    .filter(b => b && Array.isArray(b.days) && b.days.includes(currentDayName))
    .map(b => ({
      start: parseTime(b.start, date, '09:00'),
      end: parseTime(b.end, date, '17:00'),
      label: b.label || 'Unavailable'
    }));

  // Add Sleep as a constraint
  const sleepStart = parseTime(preferences?.sleep_start, date, '22:00');
  const sleepEnd = parseTime(preferences?.sleep_end, date, '07:00');
  
  // Handle overnight sleep
  if (isAfter(sleepEnd, sleepStart)) {
    constraints.push({ start: sleepStart, end: sleepEnd, label: 'Sleep' });
  } else {
    // Sleep spans midnight
    constraints.push({ start: sleepStart, end: endOfDay(date), label: 'Sleep' });
    constraints.push({ start: dayStart, end: sleepEnd, label: 'Sleep' });
  }

  // 2. Add Calendar Events
  const fixedEvents = calendarEvents
    .filter(event => event && (event.start?.dateTime || event.start?.date) && (event.end?.dateTime || event.end?.date))
    .map(event => ({
      start: parseISO(event.start.dateTime || event.start.date!),
      end: parseISO(event.end.dateTime || event.end.date!),
      title: event.summary || 'Calendar Event',
      type: 'event' as const
    })).filter(e => isSameDay(e.start, date));

  // 3. Merge all "Blocked" times and sort
  const allBlocked = [
    ...constraints.map(c => ({ start: c.start, end: c.end, title: c.label, type: 'constraint' as const })),
    ...fixedEvents.map(e => ({ start: e.start, end: e.end, title: e.title, type: 'event' as const }))
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // 4. Fill gaps with tasks
  let currentTime = dayStart;
  let focusedMinutesSinceBreak = 0;
  let focusBlocksSinceBreak = 0;
  const activeTasks = [...tasks].sort((a, b) => {
    // Priority sorting: High > Medium > Low
    const pMap = { high: 3, medium: 2, low: 1 };
    return (pMap[b.priority as keyof typeof pMap] || 2) - (pMap[a.priority as keyof typeof pMap] || 2);
  });

  while (isBefore(currentTime, endOfDay(date))) {
    // Check if current time is inside a blocked period
    const block = allBlocked.find(b => 
      (isAfter(currentTime, b.start) || currentTime.getTime() === b.start.getTime()) && 
      isBefore(currentTime, b.end)
    );

    if (block) {
      schedule.push({
        id: Math.random().toString(36).substr(2, 9),
        time: format(currentTime, 'h:mm a'),
        startTime: currentTime,
        endTime: block.end,
        title: block.title,
        type: block.type,
        duration: Math.round((block.end.getTime() - currentTime.getTime()) / 60000),
        description: block.type === 'constraint' ? 'Locked period (School/Sleep)' : 'Calendar Event',
        specific_action: block.type === 'constraint'
          ? `Keep this time protected for ${block.title}.`
          : `Attend ${block.title}.`,
        success_condition: block.type === 'constraint'
          ? 'This protected time stays unscheduled.'
          : 'The event is attended or intentionally skipped.',
        why_now: 'This time is already fixed on your calendar.',
      });
      currentTime = block.end;
      focusedMinutesSinceBreak = 0;
      focusBlocksSinceBreak = 0;
      continue;
    }

    // Find the next blocked period
    const nextBlock = allBlocked.find(b => isAfter(b.start, currentTime));
    const gapEnd = nextBlock ? nextBlock.start : endOfDay(date);
    const gapMinutes = Math.round((gapEnd.getTime() - currentTime.getTime()) / 60000);

    if (gapMinutes > 15 && activeTasks.length > 0) {
      const task = activeTasks.shift();
      const taskDuration = Math.min(gapMinutes, task.estimated_minutes || 60);
      const plannedEnd = addMinutes(currentTime, taskDuration);
      
      schedule.push({
        id: task.id || Math.random().toString(36).substr(2, 9),
        time: format(currentTime, 'h:mm a'),
        startTime: currentTime,
        endTime: plannedEnd,
        title: task.title,
        type: 'focus',
        duration: taskDuration,
        description: task.description || `Work on ${task.title} for ${taskDuration} minutes.`,
        specific_action: buildSpecificAction(task.title, task.description),
        success_condition: buildSuccessCondition(task.title, taskDuration),
        why_now: buildWhyNow(task.priority, taskDuration, gapMinutes, preferences?.preferred_focus_time || 'morning'),
        fallback_if_stuck: 'Spend five minutes listing the next visible step, then do only that step.',
        materials_needed: inferMaterials(task.title, task.external_url),
        originalTitle: task.title,
        taskId: task.id,
        externalUrl: task.external_url
      });
      currentTime = plannedEnd;
      focusedMinutesSinceBreak += taskDuration;
      focusBlocksSinceBreak += 1;

      // Add a break only after real focus load, not as filler after every task.
      const breakDuration = preferences?.break_length || 15;
      const needsBreak = shouldAddBreak({
        focusedMinutesSinceBreak,
        focusBlocksSinceBreak,
        gapEnd,
        currentTime,
        breakDuration,
      });

      if (needsBreak) {
        schedule.push({
          id: Math.random().toString(36).substr(2, 9),
          time: format(currentTime, 'h:mm a'),
          startTime: currentTime,
          endTime: addMinutes(currentTime, breakDuration),
          title: 'Recovery Break',
          type: 'break',
          duration: breakDuration,
          description: 'Step away briefly so the next focus block starts clean.',
          specific_action: 'Stand up, get water, and reset your workspace.',
          success_condition: 'You return ready to start the next block.',
          why_now: `You have completed ${focusedMinutesSinceBreak} minutes of focused work.`,
          break_reason: 'Added after a sustained focus stretch, not as filler.',
        });
        currentTime = addMinutes(currentTime, breakDuration);
        focusedMinutesSinceBreak = 0;
        focusBlocksSinceBreak = 0;
      }
    } else {
      // Small gap or no tasks left
      if (gapMinutes >= 20) {
        schedule.push({
          id: Math.random().toString(36).substr(2, 9),
          time: format(currentTime, 'h:mm a'),
          startTime: currentTime,
          endTime: gapEnd,
          title: 'Buffer Time',
          type: 'buffer',
          duration: gapMinutes,
          description: 'Use this open space intentionally instead of cramming in another task.',
          specific_action: 'Catch up, reset, or leave this slot open.',
          success_condition: 'You use the time deliberately or keep it protected.',
          why_now: 'The remaining gap is not a good fit for a focused task.',
        });
      }
      currentTime = gapEnd;
    }
  }

  return schedule;
}

// Helper: Parse "HH:mm" into a Date object for a specific day
function parseTime(timeStr: string | undefined | null, date: Date, defaultTime = '08:00'): Date {
  const safeTime = (typeof timeStr === 'string' && /^\d{2}:\d{2}$/.test(timeStr)) ? timeStr : defaultTime;
  const [hours, minutes] = safeTime.split(':').map(Number);
  return setMinutes(setHours(startOfDay(date), hours), minutes);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return startOfDay(d1).getTime() === startOfDay(d2).getTime();
}

function shouldAddBreak({
  focusedMinutesSinceBreak,
  focusBlocksSinceBreak,
  gapEnd,
  currentTime,
  breakDuration,
}: {
  focusedMinutesSinceBreak: number;
  focusBlocksSinceBreak: number;
  gapEnd: Date;
  currentTime: Date;
  breakDuration: number;
}): boolean {
  const hasRoomForBreakAndNextBlock = isBefore(addMinutes(currentTime, breakDuration + 25), gapEnd);
  if (!hasRoomForBreakAndNextBlock) return false;
  return focusedMinutesSinceBreak >= 75 || (focusBlocksSinceBreak >= 2 && focusedMinutesSinceBreak >= 60);
}

function buildSpecificAction(title: string, description?: string): string {
  if (description && description.trim().length > 0) {
    return `Work through: ${description.trim()}`;
  }

  return `Open the materials for "${title}" and complete the next concrete deliverable.`;
}

function buildSuccessCondition(title: string, duration: number): string {
  if (duration <= 30) {
    return `A small, visible piece of "${title}" is finished or ready to submit.`;
  }

  return `You can point to clear progress on "${title}" before this block ends.`;
}

function buildWhyNow(
  priority: 'low' | 'medium' | 'high',
  taskDuration: number,
  gapMinutes: number,
  preferredFocusTime: SchedulingPreferences['preferred_focus_time']
): string {
  if (priority === 'high') return 'This is high priority, so it gets protected time before easier work.';
  if (taskDuration >= gapMinutes - 15) return 'This task fits the available calendar gap cleanly.';
  return `This slot matches your ${preferredFocusTime} planning preference.`;
}

function inferMaterials(title: string, externalUrl?: string): string[] {
  const materials = ['Task notes'];
  const lowerTitle = title.toLowerCase();

  if (externalUrl) materials.push('Linked assignment page');
  if (lowerTitle.includes('study') || lowerTitle.includes('exam') || lowerTitle.includes('quiz')) {
    materials.push('Class notes');
  }
  if (lowerTitle.includes('write') || lowerTitle.includes('essay') || lowerTitle.includes('draft')) {
    materials.push('Draft document');
  }

  return materials;
}
