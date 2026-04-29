/**
 * Plan Pilot AI Scheduler Logic (Ollie Brain)
 * 
 * This module handles the "Deadline-First" scheduling logic.
 * It takes external data (Canvas, Google Calendar) and transforms it into 
 * a structured daily flight plan.
 */

import { CanvasAssignment } from '../canvas/api';
import { addMinutes, format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export interface ScheduleBlock {
  time: string;
  title: string;
  type: 'focus' | 'break' | 'event' | 'buffer';
  description: string;
}

export interface SchedulerInput {
  assignments: CanvasAssignment[];
  milestones: CanvasAssignment[];
  calendarEvents: any[];
  preferredStartTime: string; // e.g. "08:00"
}

/**
 * Generates a structured schedule based on deadlines and fixed events.
 */
export function generateDeadlineFirstSchedule(input: SchedulerInput): ScheduleBlock[] {
  const { assignments, milestones, calendarEvents, preferredStartTime } = input;
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
  const urgentAssignments = assignments.filter(a => {
    const diff = new Date(a.due_at).getTime() - new Date().getTime();
    return diff > 0 && diff < (48 * 60 * 60 * 1000); // Next 48 hours
  });

  // 3. Building the Timeline
  let currentTime = parseISO(`${format(new Date(), 'yyyy-MM-dd')}T${preferredStartTime}:00`);
  const dayEnd = parseISO(`${format(new Date(), 'yyyy-MM-dd')}T22:00:00`); // Default 10pm end

  // Basic Loop to fill the day
  while (isBefore(currentTime, dayEnd)) {
    // Check for fixed event overlap
    const eventOverlap = fixedBlocks.find(b => 
      (isAfter(currentTime, b.start) || currentTime.getTime() === b.start.getTime()) && 
      isBefore(currentTime, b.end)
    );

    if (eventOverlap) {
      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: eventOverlap.title,
        type: 'event',
        description: eventOverlap.description
      });
      currentTime = eventOverlap.end;
      continue;
    }

    // Assign Focus Blocks for Urgent Tasks
    if (urgentAssignments.length > 0) {
      const task = urgentAssignments[0]; // Simple queue for now
      const duration = 90; // 90 min deep work
      
      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: `Deep Work: ${task.name}`,
        type: 'focus',
        description: `Deadline-First Focus: Assignment is due soon! (${format(new Date(task.due_at), 'MMM do @ h:mm a')})`
      });
      
      currentTime = addMinutes(currentTime, duration);
      
      // Mandatory break
      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: 'Recharge Break',
        type: 'break',
        description: 'Step away from the screen for 15 minutes.'
      });
      currentTime = addMinutes(currentTime, 15);
      
      // Move to next task if this one is "covered" (simplification)
      urgentAssignments.shift();
    } else {
      if (isNoSchoolDay) {
        schedule.push({
          time: format(currentTime, 'h:mm a'),
          title: 'Off-Duty',
          type: 'break',
          description: 'No school today and no urgent deadlines. Enjoy your break!'
        });
        break; // Stop generating blocks if it's a day off and no urgent work
      }

      // General focus or administrative work
      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: 'Open Focus Block',
        type: 'focus',
        description: 'Review your task list and pick the next highest priority.'
      });
      currentTime = addMinutes(currentTime, 60);
      
      schedule.push({
        time: format(currentTime, 'h:mm a'),
        title: 'Quick Break',
        type: 'break',
        description: 'Stretch and hydrate.'
      });
      currentTime = addMinutes(currentTime, 10);
    }
  }

  return schedule;
}
