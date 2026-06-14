# Bruno Page Context and Suggested Actions Implementation Plan

**Goal:** Make the global Bruno panel aware of the active dashboard page and offer useful one-click prompts for that context.

**Architecture:** Dashboard pages register typed metadata with the existing `BrunoProvider`. The shell renders a context banner, while `BrunoChatSidebar` sends the same metadata with every request and routes typed or suggested prompts through one submit function. The API validates the metadata and adds a clearly delimited page-context block to Bruno's system prompt.

**Tech Stack:** Next.js 16 App Router, React 19.2.0, TypeScript, AI SDK 6, Zod, React Testing Library, Vitest.

---

### Task 1: Add Context UI Components

**Files:**
- Create: `apps/web/components/bruno/BrunoContextBanner.tsx`
- Create: `apps/web/components/bruno/BrunoSuggestedActions.tsx`
- Create: `apps/web/components/bruno/__tests__/BrunoContextBanner.test.tsx`
- Create: `apps/web/components/bruno/__tests__/BrunoSuggestedActions.test.tsx`

- [ ] Write failing tests for the active context label, fallback label, source-specific actions, fallback actions, and prompt callback.
- [ ] Implement the banner and suggested action registry.
- [ ] Run the focused component tests.

### Task 2: Register Dashboard Page Context

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/app/dashboard/tasks/page.tsx`
- Modify: `apps/web/app/dashboard/daily-plan/page.tsx`
- Modify: `apps/web/app/dashboard/calendar/page.tsx`

- [ ] Register static context for Dashboard, Tasks, and Daily Plan.
- [ ] Register memoized dynamic Calendar context with the active view and selected date.
- [ ] Replace Daily Plan's dead local Bruno open state with the global provider for assignment help and deconstruction.
- [ ] Run typecheck and targeted lint.

### Task 3: Transport and Validate Page Context

**Files:**
- Create: `apps/web/lib/bruno/chat-request.ts`
- Create: `apps/web/lib/bruno/page-context.ts`
- Create: `apps/web/lib/bruno/__tests__/chat-request.test.ts`
- Create: `apps/web/lib/bruno/__tests__/page-context.test.ts`
- Modify: `apps/web/components/dashboard/BrunoChatSidebar.tsx`
- Modify: `apps/web/app/api/ai/chat/route.ts`

- [ ] Write failing tests for request-body context inclusion and safe prompt-block formatting.
- [ ] Add a bounded Zod schema and page-context prompt builder.
- [ ] Include current context in normal messages and plan-approval messages.
- [ ] Inject the validated context block into Bruno's system prompt.
- [ ] Run focused tests and typecheck.

### Task 4: Share Chat Submission for Suggested Actions

**Files:**
- Modify: `apps/web/components/dashboard/BrunoChatSidebar.tsx`
- Modify: `apps/web/components/bruno/BrunoShell.tsx`

- [ ] Refactor the existing input handler into `submitPrompt(prompt, event?)`.
- [ ] Render the context banner in the shell.
- [ ] Render suggested actions above the composer and submit their prompts through `submitPrompt`.
- [ ] Run focused tests, targeted lint, typecheck, and production build.
