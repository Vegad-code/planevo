const input1 = "Finished biology reading at 4 pm in 30 minutes.";
const input2 = "Buy milk tomorrow at 9:30 am";
const input3 = "Call John takes 1 hr by 5p.m.";
const input4 = "Do laundry ~45m";
const input5 = "Fix bugs in 2 hours";

function parseTaskInput(input) {
  let title = input;
  let estimatedMinutes;
  let dueDateStr;

  // Duration
  const durationRegex = /(?:(?:in|for|takes)\s+|~)?\b(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hours)\b/i;
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

  // Time
  const timeRegex = /(?:at|by)?\s*\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?:\b|\s|$)/i;
  const timeMatch = title.match(timeRegex);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3].toLowerCase().replace(/\./g, '');
    
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    
    dueDateStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    title = title.replace(timeMatch[0], '');
  }

  // Cleanup
  title = title.replace(/\s([.,!?;:])(?=\s|$)/g, '$1'); // Remove space before punctuation
  title = title.replace(/\s{2,}/g, ' ').trim();

  return { title, estimatedMinutes, dueDateStr };
}

console.log(parseTaskInput(input1));
console.log(parseTaskInput(input2));
console.log(parseTaskInput(input3));
console.log(parseTaskInput(input4));
console.log(parseTaskInput(input5));
