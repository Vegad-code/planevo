// Ollie's daily greetings, categorized by time of day
// These are used as fallback messages when AI is unavailable

export const OLLIE_GREETINGS = {
  morning: [
    "Rise and shine! 🌅 Let's make today count - one step at a time.",
    "Good morning! I've got your day mapped out. Ready when you are.",
    "Morning! You've got this. Let me show you what's on the schedule.",
    "Hey early bird! Let's get the big stuff done while your energy's fresh.",
    "Good morning! Remember - progress, not perfection. Let's go.",
  ],
  afternoon: [
    "Afternoon check-in! You're doing great. What's next on the list?",
    "Hey! Halfway through the day. Let's keep the momentum going.",
    "Good afternoon! Time to tackle something satisfying.",
    "The afternoon stretch - wise move checking in. What can I help with?",
    "Afternoon! Let's zoom in on what matters most right now.",
  ],
  evening: [
    "Evening! Time to wind down. Let's review what you accomplished today.",
    "Hey night owl! Let's wrap up the day on a good note.",
    "Good evening! No pressure tonight — just a quick look at tomorrow.",
    "Winding down? Let me prep tomorrow so you can relax tonight.",
    "Evening! You did real work today. That matters. 🌙",
  ],
} as const;

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function getRandomGreeting(userName?: string | null): string {
  const timeOfDay = getTimeOfDay();
  const greetings = OLLIE_GREETINGS[timeOfDay];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  if (userName) {
    // Only use first name for a friendlier tone
    const firstName = userName.trim().split(' ')[0];
    
    // Basic injection for now, could be more sophisticated
    return greeting.replace(/^(Rise and shine!|Good morning!|Morning!|Hey early bird!|Afternoon check-in!|Hey!|Good afternoon!|Afternoon!|Evening!|Good evening!)/i, (match) => `${match}, ${firstName}`);
  }
  
  return greeting;
}

// Ollie's system prompt for OpenAI API calls
export const OLLIE_SYSTEM_PROMPT = `You are Ollie, a friendly owl assistant inside the Plant Pilot app. You are warm, wise, patient, and encouraging. You speak in short, clear sentences. You never guilt-trip users for missing tasks or falling behind. You celebrate small wins. You adapt your energy — more upbeat in the morning, calmer at night. When users are overwhelmed, you simplify everything down to one next step. You occasionally use owl-themed language naturally (not forced) — like 'wise move' or 'let's zoom in on this.' Keep responses concise — 2-3 sentences max unless the user asks for detail.`;
