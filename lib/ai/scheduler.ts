/**
 * Plan Pilot AI Scheduler Logic (Ollie Brain) v2
 * 
 * This module handles the "Deadline-First" scheduling logic with
 * dynamic block lengths, contextual breaks, and energy awareness.
 * It takes external data (Canvas, Google Calendar) and transforms it into 
 * a structured daily flight plan that feels human, not robotic.
 */

import { CanvasAssignment } from '../canvas/api';
import { addMinutes, format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export interface ScheduleBlock {
  time: string;
  title: string;
  type: 'focus' | 'break' | 'event' | 'buffer';
  duration: number; // minutes — stored for the refinement layer
  description: string;
  [key: string]: any; // Ensure compatibility with Json type
}

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface SchedulerInput {
  assignments: CanvasAssignment[];
  milestones: CanvasAssignment[];
  calendarEvents: any[];
  preferredStartTime: string; // e.g. "08:00"
  energyLevel?: EnergyLevel;
}

// ── Break variety pool ──────────────────────────────────────────────
const BREAK_POOL: { title: string; desc: string; minDuration: number; maxDuration: number }[] = [
  { title: 'Hydration Stop', desc: 'Grab some water and reset.', minDuration: 5, maxDuration: 10 },
  { title: 'Active Stretch', desc: 'Stand up, stretch your arms and legs for a few minutes.', minDuration: 8, maxDuration: 12 },
  { title: 'Mindful Pause', desc: 'Close your eyes and take 10 deep breaths.', minDuration: 10, maxDuration: 15 },
  { title: 'Walk Break', desc: 'Take a quick walk — even around the room helps.', minDuration: 10, maxDuration: 15 },
  { title: 'Snack & Recharge', desc: 'Fuel up with something light. Your brain needs it.', minDuration: 10, maxDuration: 15 },
  { title: 'Fresh Air Break', desc: 'Step outside or open a window for a change of scenery.', minDuration: 10, maxDuration: 15 },
  { title: 'Power Rest', desc: 'Close your laptop and let your mind wander for a bit.', minDuration: 15, maxDuration: 20 },
];

// ── Helpers ──────────────────────────────────────────────────────────

/** Returns a random integer between min (inclusive) and max (inclusive). */
function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a break from the pool that hasn't been used recently. */
function pickBreak(usedIndices: Set<number>): typeof BREAK_POOL[number] {
  // Build list of available indices
  let available = BREAK_POOL.map((_, i) => i).filter(i => !usedIndices.has(i));
  // If we exhausted the pool, reset
  if (available.length === 0) {
    usedIndices.clear();
    available = BREAK_POOL.map((_, i) => i);
  }
  const idx = available[Math.floor(Math.random() * available.length)];
  usedIndices.add(idx);
  return BREAK_POOL[idx];
}

/** Determine focus block duration based on urgency + energy. */
function computeFocusDuration(hoursUntilDue: number, energy: EnergyLevel, blockIndex: number): number {
  // Base ranges per energy level
  const ranges: Record<EnergyLevel, [number, number]> = {
    high:   [75, 105],
    medium: [50, 80],
    low:    [30, 50],
  };

  let [min, max] = ranges[energy];

  // Urgent tasks get a bump
  if (hoursUntilDue < 24) {
    min += 15;
    max += 15;
  } else if (hoursUntilDue < 72) {
    min += 5;
    max += 5;
  }

  // Fatigue: later blocks trend shorter
  if (blockIndex >= 4) {
    max = Math.max(min, max - 15);
  }

  return randBetween(min, max);
}

/**
 * Generates a structured schedule based on deadlines and fixed events.
 * Now with dynamic durations, contextual breaks, and energy awareness.
 */
export function generateDeadlineFirstSchedule(input: SchedulerInput): ScheduleBlock[] {
  const { assignments, milestones, calendarEvents, preferredStartTime, energyLevel = 'medium' } = input;
  const schedule: ScheduleBlock[] = [];
  
  // 1. Process Fixed Events (Calendar)
  const fixedBlocks = calendarEvents.map(event => ({
    start: parseISO(event.start.dateTime || event.start.date),
    end: parseISO(event.end.dateTime || event.end.date),
    title: event.summary,
    type: 'event' as const,
    description: 'Fixed calendar event'
  })).filter(block => {
    const today = startOfDay(new Date());
    return isAfter(block.start, today) && isBefore(block.start, endOfDay(today));
  });

  // 1b. Check for School Milestones Today
  const todayMilestones = milestones.filter(m => {
    const mDate = startOfDay(new Date(m.due_at));
    const today = startOfDay(new Date());
    return mDate.getTime() === today.getTime();
  });

  const isNoSchoolDay = todayMilestones.some(m => 
    m.name.toLowerCase().includes('no school') || 
    m.name.toLowerCase().includes('break') || 
    m.name.toLowerCase().includes('closed')
  );

  // 2. Identify Academic Priorities (Canvas)
  const activeAssignments = [...assignments]
    .filter(a => new Date(a.due_at).getTime() > new Date().getTime())
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  // 3. Building the Timeline
  let currentTime = parseISO(`${format(new Date(), 'yyyy-MM-dd')}T${preferredStartTime}:00`);
  const dayEnd = parseISO(`${format(new Date(), 'yyyy-MM-dd')}T22:00:00`);

  let focusBlockIndex = 0;
  let minutesSinceBreak = 0;
  const usedBreakIndices = new Set<number>();

  while (isBefore(currentTime, dayEnd)) {
    // ── Fixed event check ──
    const eventOverlap = fixedBlocks.find(b => 
      (isAfter(currentTime, b.start) || currentTime.getTime() === b.start.getTime()) && 
      isBefore(currentTime, b.end)
    );

    if (eventOverlap) {
      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: eventOverlap.title,
        type: 'event',
        duration: Math.round((eventOverlap.end.getTime() - eventOverlap.start.getTime()) / 60000),
        description: eventOverlap.description
      });
      currentTime = eventOverlap.end;
      minutesSinceBreak = 0; // events act as a mental reset
      continue;
    }

    // ── Assign Focus Blocks for Assignments ──
    if (activeAssignments.length > 0) {
      const task = activeAssignments[0];
      const dueDate = new Date(task.due_at);
      const diffHours = (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      const isUrgent = diffHours < 72;

      const focusDuration = computeFocusDuration(diffHours, energyLevel, focusBlockIndex);

      // Contextual title based on urgency
      const titlePrefix = diffHours < 24 ? '🔴 Priority' : isUrgent ? 'Focus' : 'Deep Work';

      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: `${titlePrefix}: ${task.name}`,
        type: 'focus',
        duration: focusDuration,
        description: isUrgent
          ? `Due soon — ${format(dueDate, 'MMM do @ h:mm a')}. Lock in and make progress.`
          : `Working ahead. Due ${format(dueDate, 'MMM do')}.`
      });

      currentTime = addMinutes(currentTime, focusDuration);
      minutesSinceBreak += focusDuration;
      focusBlockIndex++;

      // ── Smart break logic ──
      // Only insert a break if cumulative focus exceeds threshold
      const breakThreshold = energyLevel === 'high' ? 120 : energyLevel === 'medium' ? 90 : 50;

      if (minutesSinceBreak >= breakThreshold) {
        const brk = pickBreak(usedBreakIndices);
        const breakDuration = randBetween(brk.minDuration, brk.maxDuration);

        schedule.push({
          time: format(currentTime, 'h:mm a'),
          title: brk.title,
          type: 'break',
          duration: breakDuration,
          description: brk.desc
        });
        currentTime = addMinutes(currentTime, breakDuration);
        minutesSinceBreak = 0;
      }

      activeAssignments.shift();
    } else {
      // ── No assignments left ──
      if (isNoSchoolDay) {
        schedule.push({
          time: format(currentTime, 'h:mm a'),
          title: 'Off-Duty',
          type: 'break',
          duration: 0,
          description: 'No school today and no immediate deadlines. Enjoy your rest!'
        });
        break;
      }

      // Open focus block with varied duration
      const openDuration = randBetween(45, 75);
      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: 'Open Focus Block',
        type: 'focus',
        duration: openDuration,
        description: 'Review your task list and pick the next highest priority.'
      });
      currentTime = addMinutes(currentTime, openDuration);
      minutesSinceBreak += openDuration;

      if (minutesSinceBreak >= 90) {
        const brk = pickBreak(usedBreakIndices);
        const breakDuration = randBetween(brk.minDuration, brk.maxDuration);
        schedule.push({
          time: format(currentTime, 'h:mm a'),
          title: brk.title,
          type: 'break',
          duration: breakDuration,
          description: brk.desc
        });
        currentTime = addMinutes(currentTime, breakDuration);
        minutesSinceBreak = 0;
      }
    }
  }

  return schedule;
}
