import { TaskPriority } from '@/types/tasks';

export interface ParsedTask {
  title: string;
  priority?: TaskPriority;
  estimatedMinutes?: number;
  dueDate?: string;
  source?: string;
}

/**
 * A lightweight NLP parser for task inputs.
 * Extracts:
 * - Priority: #high, #critical, #low, #medium
 * - Estimated Time: ~30m, ~1h, ~45min
 * - Source/Tags: #Personal, #Canvas (anything with # that isn't priority)
 * - Due Date (basic): "tomorrow", "today", "next week" (This is simple regex matching for now)
 */
export function parseTaskInput(input: string): ParsedTask {
  let title = input;
  let priority: TaskPriority | undefined;
  let estimatedMinutes: number | undefined;
  let dueDate: string | undefined;
  let source: string | undefined;

  // 1. Extract Priority (e.g., #high, #critical)
  const priorityMatch = title.match(/#(critical|high|medium|low)/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as TaskPriority;
    title = title.replace(priorityMatch[0], '');
  }

  // 2. Extract Estimated Time (e.g., ~30m, in 30 minutes, 2 hrs)
  const durationRegex = /(?:(?:in|for|takes)\s+|~)?\b(\d+)\s*(m|min|mins|minutes|mintues|minuts|h|hr|hrs|hours)\b/i;
  const durationMatch = title.match(durationRegex);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('h')) {
      estimatedMinutes = value * 60;
    } else {
      estimatedMinutes = value;
    }
    title = title.replace(durationMatch[0], '');
  }

  // 3. Extract other tags for source/category (e.g., #Personal)
  const tagMatch = title.match(/#([a-zA-Z0-9_]+)/);
  if (tagMatch) {
    source = tagMatch[1];
    title = title.replace(tagMatch[0], '');
  }

  // 4. Basic Date Extraction (tomorrow, today, days of week)
  const lowerTitle = title.toLowerCase();
  const today = new Date();
  const baseDate = new Date(today);
  let dateFound = false;
  
  if (lowerTitle.includes('tomorrow')) {
    baseDate.setDate(baseDate.getDate() + 1);
    title = title.replace(/tomorrow/i, '');
    dateFound = true;
  } else if (lowerTitle.includes('today')) {
    title = title.replace(/today/i, '');
    dateFound = true;
  } else if (lowerTitle.includes('next week')) {
    baseDate.setDate(baseDate.getDate() + 7);
    title = title.replace(/next week/i, '');
    dateFound = true;
  } else {
    // Basic day of week matching (e.g., "on monday", "this friday")
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      const regex = new RegExp(`(?:on |this )?${days[i]}`, 'i');
      const match = title.match(regex);
      if (match) {
        const targetDay = i;
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next occurrence
        
        baseDate.setDate(today.getDate() + daysUntil);
        title = title.replace(match[0], '');
        dateFound = true;
        break;
      }
    }
  }

  // 5. Extract Specific Time (e.g., at 4 pm, at 4, by 9:30)
  let extractedTimeStr: string | undefined;
  // Match "at 4", "at 4:30", "at 4 pm"
  const timeRegex = /(?:at|by|@)\s*\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?(?:\b|\s|$)/i;
  const timeMatch = title.match(timeRegex);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase().replace(/\./g, '') : null;
    
    if (ampm) {
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    } else {
      // Guess AM/PM based on common sense / current time
      const currentHour = today.getHours();
      const isFutureDate = dateFound && baseDate.getDate() !== today.getDate();

      if (isFutureDate) {
        // Future date heuristic: 1-6 => PM, 7-11 => AM, 12 => PM
        if (hours >= 1 && hours <= 6) hours += 12;
        if (hours === 12) hours = 12;
      } else {
        // Today heuristic: pick the next occurrence
        const candidateAM = hours === 12 ? 0 : hours;
        const candidatePM = hours === 12 ? 12 : hours + 12;
        
        if (candidateAM > currentHour) {
          hours = candidateAM;
        } else if (candidatePM > currentHour) {
          hours = candidatePM;
        } else {
          hours = candidatePM; // Default to PM if both passed
        }
      }
    }
    
    extractedTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    title = title.replace(timeMatch[0], '');
  }

  // Combine Date & Time
  if (dateFound || extractedTimeStr) {
    if (extractedTimeStr) {
      const [hours, minutes] = extractedTimeStr.split(':').map(Number);
      baseDate.setHours(hours, minutes, 0, 0);
      dueDate = baseDate.toISOString();
    } else {
      dueDate = baseDate.toISOString().split('T')[0];
    }
  }

  // Cleanup title (remove leftover prepositions and punctuation before spaces/end)
  title = title.replace(/^(on|by|for)\s+/i, '');
  title = title.replace(/\s([.,!?;:])(?=\s|$)/g, '$1');
  title = title.replace(/\s{2,}/g, ' ').trim();

  return {
    title,
    priority,
    estimatedMinutes,
    dueDate,
    source
  };
}
