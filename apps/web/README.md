# 🦉 Plan Pilot

Plan Pilot is a proactive, AI-powered productivity assistant designed to help users manage tasks, focus, and energy without the guilt of traditional to-do lists.

## 🚀 Current Progress (Phase One)
- [x] **Brutalist Design System**: High-contrast, tactile UI with no rounded corners or gradients.
- [x] **Smart Auth**: Google Sign-In and email authentication via Supabase.
- [x] **Tasks 2.0**:
  - [x] AI Priority sorting (using GPT-4o-mini).
  - [x] Task breakdown into actionable steps.
  - [x] Shame-free rescheduling (no "past due" badges).
  - [x] Garden of Done (visual history).
- [x] **Dashboard**: Real-time stats, Ollie greetings, and quick actions.
- [x] **AI Scheduling**: Basic daily plan generation based on active tasks.

## 🎯 Phase Two: Proactive Assistance (Next Steps)
The goal of Phase Two is to move from a reactive task list to a proactive "Pilot" that manages the user's focus and energy.

### 1. ⏱️ AI Focus Mode
- Implement a focus timer (Pomodoro-style but flexible).
- **Ollie Nudges**: AI check-ins during focus sessions to prevent distractions.
- Integration with the "Tasks" list to select a current focus item.

### 2. 📅 Google Calendar Sync (Full Integration)
- Fetch real-time calendar events via OAuth.
- Ollie should "look" at the calendar and schedule tasks in the empty gaps.
- Proactive alerts: "You have a gap between 2pm and 4pm, want to knock out [Task X]?"

### 3. 🔄 Adaptive Rescheduling
- Background job or trigger that detects "yesterday's unfinished business."
- Automatically reorganizes today's schedule without user intervention (with a "Start Fresh" greeting).

### 4. 📈 Habit & Goal Tracking
- **Habits**: Daily repetitive tasks with streak tracking.
- **Goals**: Long-term milestones that Ollie helps deconstruct over weeks/months.

### 5. 🦉 Ollie Personalities
- Expand `OllieAvatar` and `OllieBubble` to have distinct personalities based on user preference (e.g., "Tough Love," "Zen Master," "Hyper Productive").

---

## 🛠️ Development

### Environment Variables
Ensure you have the following in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

---

## 🤖 Handoff Note for Claude Code
When continuing work, focus on the **AI Focus Mode** first. The state for the focus timer should probably be persistent (or at least handled in a shared context/store like Zustand if needed). Check `app/dashboard/focus` for the current placeholder.
