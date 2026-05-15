# Plan Pilot Mobile — PRD

## Original Problem Statement
Build Plan Pilot Mobile (Expo) in the monorepo `apps/mobile`. The web app is already live in `apps/web`. Follow a "Shared Brain, Native UI" architecture.

## Architecture
- **Monorepo**: `/app` with `apps/web`, `apps/mobile`, `packages/core`
- **Shared Core**: `@plan-pilot/core` exports Database types + Supabase mobile client factory
- **Mobile**: Expo SDK 54, Expo Router, React Native with TypeScript
- **Auth**: Supabase auth with `expo-secure-store` for native token persistence
- **Design**: "Immersive Minimalist" with Forest Green (#5d8a66) brand colors

## User Personas (from STRATEGY.md)
- **The Modern Student**: Canvas/Blackboard users overwhelmed by deadlines
- **The Professional Builder**: Early-career professionals wanting AI-scheduled deep work
- **The Complexity Juggler**: Anyone whose schedule changes faster than they can plan

## Core Requirements (Static)
1. Shared `@plan-pilot/core` package with typed Supabase client + Database types
2. Native Supabase authentication (email/password via SecureStore)
3. Three tab screens: Daily Plan, Ollie Chat, Settings
4. "Immersive Minimalist" design matching web app
5. Lucide React Native icons
6. Expo Router file-based navigation with auth gate

## What's Been Implemented (2026-01-15)
### packages/core
- `src/types.ts` — Full Database types (shared with web)
- `src/supabase-client.ts` — Platform-agnostic Supabase client factory with custom storage adapter support
- `src/index.ts` — Clean exports (types + mobile client, AI modules web-only)

### apps/mobile
- **Auth**: `lib/supabase.ts` (SecureStore adapter), `providers/AuthProvider.tsx`, `app/login.tsx`
- **Navigation**: `app/_layout.tsx` (AuthGate), `app/(tabs)/_layout.tsx` (3 tabs)
- **Daily Plan**: `app/(tabs)/index.tsx` — Greeting, connection chips, next action hero, energy selector, schedule blocks, task stats, expandable sections
- **Ollie Chat**: `app/(tabs)/chat.tsx` — Chat interface with message history, Supabase persistence
- **Settings**: `app/(tabs)/settings.tsx` — Profile card, connections, preferences, sign out
- **Design**: `constants/Colors.ts` — Full Forest Green tokens (brand, surface, accent)
- **Config**: `app.json` (Plan Pilot branding), `metro.config.js` (monorepo resolution), `.env` (Supabase creds)

### Web Preview
- `frontend/src/App.js` — Phone frame simulation of all mobile screens for browser preview

## Testing Status
- TypeScript compilation: PASS (all mobile code compiles clean)
- Web preview: 14/14 tests PASS (100% success rate)
- Login → Daily Plan → Chat → Settings → Sign Out flow: PASS

## Prioritized Backlog
### P0 (Next Sprint)
- Connect Ollie Chat to Plan Pilot API for real AI responses
- Wire "Generate Today's Plan" button to `/api/ai/daily-plan` endpoint
- Push notifications setup (Expo Notifications)

### P1
- No-Shame Rollover implementation on app open
- Task creation/editing from mobile
- Canvas sync from mobile Settings

### P2
- iOS Home Screen Widget for "Next action"
- EAS build pipeline (TestFlight + Play Internal)
- Offline support with Supabase local-first
- Weekly review email integration

## Next Tasks
1. Connect mobile chat to the Plan Pilot AI API endpoint
2. Implement "Generate Plan" CTA with real API call
3. Add pull-to-refresh data sync
4. Set up EAS Build for TestFlight
