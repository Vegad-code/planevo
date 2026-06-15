const APP_ACTION_PATTERNS = [
  /\b(mark|complete|finish)\b.+\b(done|complete|finished)\b/i,
  /\b(add|create|make)\b.+\b(task|assignment|todo|to-do)\b/i,
  /\b(move|reschedule|push|shift)\b.+\b(to|for|tomorrow|today|tonight|later|next week)\b/i,
  /\b(delete|remove|clear)\b.+\b(task|assignment|todo|to-do)\b/i,
  /\b(show|open|view)\b.+\b(today|plan|schedule|tasks?)\b/i,
  /\b(what'?s next|what is next|next task|next thing)\b/i,
  /\b(start|begin)\b.+\b(focus timer|focus session)\b/i,
];

export function detectAppAction(message: string) {
  const normalized = message.trim().toLowerCase();
  return APP_ACTION_PATTERNS.some((pattern) => pattern.test(normalized));
}
