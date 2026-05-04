/**
 * Plan Pilot Agentic Scheduler v1
 * 
 * A constraint-aware scheduler that places tasks around "Hard Blocks" (School, Work)
 * and "Fixed Events" (Calendar). Designed for the "Ultimate" visual timeline.
 */

import { addMinutes, format, parse, parseISO, isAfter, isBefore, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

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
  originalTitle?: string; // Raw task name
  taskId?: string; // If linked to a DB task
}

export interface AgenticSchedulerInput {
  tasks: any[];
  calendarEvents: any[];
  preferences: SchedulingPreferences;
  date: Date;
}

/**
 * Creates a schedule by identifying "Hard Constraints" first,
 * then filling the gaps with tasks based on energy and priority.
 */
export function generateAgenticSchedule(input: AgenticSchedulerInput): ScheduleBlock[] {
  const { tasks, calendarEvents, preferences, date } = input;
  const schedule: ScheduleBlock[] = [];
  const dayStart = startOfDay(date);
  
  // 1. Generate Hard Constraints (Sleep, School)
  const currentDayName = format(date, 'EEEE');
  const constraints = preferences.unavailable_blocks
    .filter(b => b.days.includes(currentDayName))
    .map(b => ({
      start: parseTime(b.start, date),
      end: parseTime(b.end, date),
      label: b.label
    }));

  // Add Sleep as a constraint
  const sleepStart = parseTime(preferences.sleep_start, date);
  const sleepEnd = parseTime(preferences.sleep_end, date);
  
  // Handle overnight sleep
  if (isAfter(sleepEnd, sleepStart)) {
    constraints.push({ start: sleepStart, end: sleepEnd, label: 'Sleep' });
  } else {
    // Sleep spans midnight
    constraints.push({ start: sleepStart, end: endOfDay(date), label: 'Sleep' });
    constraints.push({ start: dayStart, end: sleepEnd, label: 'Sleep' });
  }

  // 2. Add Calendar Events
  const fixedEvents = calendarEvents.map(event => ({
    start: parseISO(event.start.dateTime || event.start.date),
    end: parseISO(event.end.dateTime || event.end.date),
    title: event.summary,
    type: 'event' as const
  })).filter(e => isSameDay(e.start, date));

  // 3. Merge all "Blocked" times and sort
  const allBlocked = [
    ...constraints.map(c => ({ start: c.start, end: c.end, title: c.label, type: 'constraint' as const })),
    ...fixedEvents.map(e => ({ start: e.start, end: e.end, title: e.title, type: 'event' as const }))
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // 4. Fill gaps with tasks
  let currentTime = dayStart;
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
        description: block.type === 'constraint' ? 'Locked period (School/Sleep)' : 'Calendar Event'
      });
      currentTime = block.end;
      continue;
    }

    // Find the next blocked period
    const nextBlock = allBlocked.find(b => isAfter(b.start, currentTime));
    const gapEnd = nextBlock ? nextBlock.start : endOfDay(date);
    const gapMinutes = Math.round((gapEnd.getTime() - currentTime.getTime()) / 60000);

    if (gapMinutes > 15 && activeTasks.length > 0) {
      const task = activeTasks.shift();
      const taskDuration = Math.min(gapMinutes, task.estimated_minutes || 60);
      
      schedule.push({
        id: task.id || Math.random().toString(36).substr(2, 9),
        time: format(currentTime, 'h:mm a'),
        startTime: currentTime,
        endTime: addMinutes(currentTime, taskDuration),
        title: task.title,
        type: 'focus',
        duration: taskDuration,
        description: task.description || 'Focus session',
        originalTitle: task.title,
        taskId: task.id
      });
      currentTime = addMinutes(currentTime, taskDuration);

      // Add a break if there's space
      if (isBefore(addMinutes(currentTime, 15), gapEnd)) {
        schedule.push({
          id: Math.random().toString(36).substr(2, 9),
          time: format(currentTime, 'h:mm a'),
          startTime: currentTime,
          endTime: addMinutes(currentTime, 15),
          title: 'Quick Break',
          type: 'break',
          duration: 15,
          description: 'Recharge before the next session.'
        });
        currentTime = addMinutes(currentTime, 15);
      }
    } else {
      // Small gap or no tasks left
      if (gapMinutes > 0) {
        schedule.push({
          id: Math.random().toString(36).substr(2, 9),
          time: format(currentTime, 'h:mm a'),
          startTime: currentTime,
          endTime: gapEnd,
          title: 'Buffer Time',
          type: 'buffer',
          duration: gapMinutes,
          description: 'Rest or catch up on minor items.'
        });
      }
      currentTime = gapEnd;
    }
  }

  return schedule;
}

// Helper: Parse "HH:mm" into a Date object for a specific day
function parseTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return setMinutes(setHours(startOfDay(date), hours), minutes);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return startOfDay(d1).getTime() === startOfDay(d2).getTime();
}
