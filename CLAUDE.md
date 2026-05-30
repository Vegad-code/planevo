# Project: AI Goal & Social Planner App

## What this app does
An AI-powered productivity and social platform where users:
- Input goals → AI decomposes them into plans and tasks
- Track progress on tasks and milestones
- Share plans/goals publicly to a social feed (like/comment/follow)
- Subscribe for premium AI features via Stripe

## Tech Stack

### Web (primary)
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Language: TypeScript (strict mode)
- State: Zustand for client state, React Query for server state

### iOS (planned)
- Swift / SwiftUI
- iOS 17+ deployment target
- Architecture: MVVM

### Backend & Services
- Database + Auth: Firebase (Firestore + Firebase Auth, modular SDK v9+)
- AI: Anthropic Claude API (claude-sonnet-4-6 for goal decomposition)
- Payments: Stripe (subscriptions)
- Push notifications: Firebase Cloud Messaging (web) / APNs (iOS)
- File storage: Firebase Storage

## Commands
- `npm run dev` — start dev server on http://localhost:3000
- `npm run build` — production build
- `npm run typecheck` — TypeScript check (run before committing)
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests
- `npx firebase emulators:start` — start local Firebase emulators (Auth + Firestore)
- `npx firebase deploy --only firestore:rules` — deploy Firestore security rules

## Project Structure
```
/app                  → Next.js App Router pages
  /app/(auth)         → Login, signup, onboarding
  /app/(app)          → Protected app routes (sidebar shell + dashboard)
    /dashboard        → Main dashboard (today's goals, tasks, stats)
    /scheduling       → AI scheduling interface
    /goals            → Goal management (decomposed goals)
    /calendar         → Calendar view
    /tasks            → Quick task management
    /settings         → User settings
  /feed               → Social feed (stub)
  /profile            → User profile (stub)
  page.tsx            → Landing page with features + pricing
/components           → Reusable UI components
  /ui                 → Base components (buttons, animated-hero)
  /layout             → Layout components (sidebar, app-shell)
  /goals              → Goal-specific components (stub)
  /feed               → Social feed components (stub)
/lib
  /firebase           → Firebase config, auth, Firestore helpers, FirebaseProvider
  /ai                 → Claude API calls (goal decomposition) — stub
  /stripe             → Stripe helpers — stub
/types                → Global TypeScript types (not yet created)
/hooks                → Custom React hooks (not yet created)
/store                → Zustand stores (not yet created)
```

## Core Data Models
```
users          → id, username, avatar_url, bio, subscription_tier
goals          → id, user_id, title, description, is_public, status, created_at
plans          → id, goal_id, title, steps (jsonb), ai_generated
tasks          → id, plan_id, user_id, title, due_date, completed, priority
posts          → id, user_id, goal_id, content, likes_count, created_at
follows        → follower_id, following_id
```

## Conventions — ALWAYS follow these

### General
- TypeScript strict mode — no `any` types, ever
- Use `async/await`, never `.then()` chains
- All Firestore queries go through `/lib/firebase/firestore.ts` helpers, never raw in components
- All Firebase Auth calls go through `/lib/firebase/auth.ts` helpers
- All AI calls go through `/lib/ai` — never call Anthropic API directly from components
- Environment variables: use `NEXT_PUBLIC_` prefix only for values safe to expose

### Components
- Server Components by default in Next.js App Router
- Add `"use client"` only when you need interactivity or browser APIs
- Props must be typed with explicit interfaces, not inline types
- File naming: PascalCase for components, camelCase for utils

### Auth & Security
- All protected routes use Firestore Security Rules — never trust client-side auth alone
- Users can only read/write their own data unless a document is marked `is_public = true`
- Stripe webhooks must verify the signature — never skip this

### AI Goal Decomposition
- Always stream responses for the goal decomposition UI
- Prompt structure: system prompt in `/lib/ai/prompts.ts`, never inline
- Cap tokens at 1000 per decomposition call
- Cache decompositions — don't re-run AI if the goal hasn't changed

### Git
- Create a new branch before every feature: `git checkout -b feature/goal-decomposition`
- Commit messages: imperative mood, under 72 chars (e.g. "Add goal decomposition stream")
- Never commit `.env.local` or secrets

## Subscriptions / Stripe
- Free tier: up to 3 active goals, basic task tracking
- Pro tier ($X/mo): unlimited goals, AI decomposition, social posting
- Stripe webhooks update `users/{userId}.subscription_tier` in Firestore
- Use `stripe.webhooks.constructEvent()` for all webhook handlers

## Never touch
- `/app/api/webhooks/stripe` — webhook signature verification logic
- Firestore Security Rules (discuss first before changing)
- `next.config.js` without discussing first

## Before you write any code
1. Check if a similar component/function already exists
2. For new Firestore collections, sketch the document shape and security rules first and show me
3. For AI features, confirm the prompt design before implementing
4. For any Stripe changes, test in test mode first (`STRIPE_SECRET_KEY` should start with `sk_test_`)

## Claude-specific instructions
- I am a beginner — explain your reasoning as you code, briefly
- When you add a new file, tell me where it goes and why
- If you see a better architectural approach, suggest it but ask before diverging
- Break large tasks into steps and confirm each one before continuing
- If something could break auth or payments, stop and ask me first

## Development Phases

### Phase 1: Foundation ✅ COMPLETE
- Project scaffolded with Next.js 14, Tailwind CSS, TypeScript
- Firebase integration (auth context, config singleton)
- Folder structure and routing established
- Environment variables configured

### Phase 2: UI Shell & Landing Page ✅ COMPLETE
**Built:**
- Landing page with animated hero, features section (4 cards), and pricing tiers (Free/Pro/Team)
- App dashboard skeleton with sidebar navigation
- Sidebar with nav items: Dashboard, AI Scheduling, My Plans, Calendar, Quick Tasks, Settings
- Dashboard showing today's goals, tasks, and AI feature teasers
- shadcn Button component + cn() utility
- Tailwind CSS variables and spektr-cyan-50 custom color

**Not yet built (stubs exist):**
- Login/signup authentication pages
- Firestore integration (queries, mutations)
- Zustand store + React Query setup
- AI decomposition feature
- Calendar component
- Individual goal/task management pages
- Social feed

### Phase 3: Features & AI Integration — NEXT
**Priority order:**
1. Auth pages (login/signup with Firebase Auth)
2. Goal creation + AI decomposition (Claude API integration)
3. Calendar component integration
4. Task management and quick-add
5. Social feed pages
6. Stripe subscription integration
7. Progress tracking dashboard

## Codex Integration
Codex plugin (openai/codex-plugin-cc) is installed in this Claude Code session.

### When to suggest Codex commands
- After implementing a feature or making significant code changes → suggest `/codex:review`
- Before committing code to git → suggest `/codex:review`
- When stuck on a bug or complex logic → suggest `/codex:rescue`
- For architectural decisions needing a second opinion → suggest `/codex:adversarial-review`

### Rules
- Always suggest the relevant Codex command at the end of a task, briefly explaining why
- If Codex proposes changes, review them together before applying
- Use `/codex:status` and `/codex:result` to retrieve async job output
- `/codex:cancel` to stop a running job
- Free ChatGPT tier has limited Codex allocation — prefer `/codex:review` over `/codex:rescue` for simple cases