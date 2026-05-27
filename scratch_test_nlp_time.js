function parseTime(title, currentHourStr, isFutureDate) {
  let dueDateStr;
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
      const currentHour = parseInt(currentHourStr, 10);
      if (isFutureDate) {
        // Future date heuristic: 1-6 => PM, 7-11 => AM, 12 => PM
        if (hours >= 1 && hours <= 6) hours += 12;
        if (hours === 12) hours = 12;
      } else {
        // Today heuristic: pick the next occurrence
        let candidateAM = hours === 12 ? 0 : hours;
        let candidatePM = hours === 12 ? 12 : hours + 12;
        
        if (candidateAM > currentHour) {
          hours = candidateAM;
        } else if (candidatePM > currentHour) {
          hours = candidatePM;
        } else {
          hours = candidatePM; // Default to PM if both passed
        }
      }
    }
    
    dueDateStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    title = title.replace(timeMatch[0], '');
  }
  return { title: title.trim(), dueDateStr };
}

console.log("10 AM, 'at 4':", parseTime("Task at 4", 10, false));   // Expect 16:00
console.log("5 PM, 'at 8':", parseTime("Task at 8", 17, false));   // Expect 20:00 (8 PM)
console.log("9 PM, 'at 8':", parseTime("Task at 8", 21, false));   // Expect 20:00 (Both passed, default PM, or maybe tomorrow?) 
// Wait, if it's 9 PM and they say "at 8", they probably mean 8 AM tomorrow, but since the date is 'today' they messed up or we should roll over.
console.log("Future, 'at 4':", parseTime("Task at 4", 10, true)); // Expect 16:00
console.log("Future, 'at 10':", parseTime("Task at 10", 10, true));// Expect 10:00
console.log("Any time, 'at 4 pm':", parseTime("Task at 4 pm", 10, false)); // Expect 16:00
console.log("Any time, 'at 12':", parseTime("Task at 12", 9, false)); // Expect 12:00
