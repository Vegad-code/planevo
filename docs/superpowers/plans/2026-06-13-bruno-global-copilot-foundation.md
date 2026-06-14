# Bruno Global Copilot Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Planevo's route-based and Calendar-local Bruno entry points with one typed, globally mounted Bruno shell available throughout the dashboard.

**Architecture:** A client-side `BrunoProvider` owns open state and page context. `BrunoShell` renders the existing rich `BrunoChatSidebar` as a right-side overlay from the dashboard layout, while the main sidebar calls `openBruno()` instead of navigating. Calendar retains its task backlog but no longer mounts a second Bruno chat instance.

**Tech Stack:** Next.js 16 App Router, React 19.2.0, TypeScript, React Testing Library, Vitest, Framer Motion.

---

### Task 1: Align React Workspace Versions

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Record the failing dependency check**

Run:

```bash
npm ls react react-dom --depth=0
```

Expected: non-zero exit showing web React and React DOM are not resolved to the same exact version.

- [ ] **Step 2: Align the web manifest to the monorepo's installed React version**

Set both dependencies to:

```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0"
}
```

- [ ] **Step 3: Refresh the lockfile**

Run:

```bash
npm install --package-lock-only
```

Expected: exit 0 with `package-lock.json` updated and no source files changed.

- [ ] **Step 4: Verify exact dependency alignment**

Run:

```bash
npm ls react react-dom --depth=0
```

Expected: exit 0, with web and mobile resolving React and React DOM to `19.2.0`.

### Task 2: Add Typed Bruno Provider State

**Files:**
- Create: `apps/web/lib/bruno/types.ts`
- Create: `apps/web/components/bruno/BrunoProvider.tsx`
- Create: `apps/web/components/bruno/__tests__/BrunoProvider.test.tsx`

- [ ] **Step 1: Write failing provider tests**

Cover these behaviors with a small consumer harness:

```tsx
it('opens Bruno with page context and closes it', async () => {
  render(
    <BrunoProvider>
      <ProviderHarness />
    </BrunoProvider>
  );

  await user.click(screen.getByRole('button', { name: 'Open tasks' }));
  expect(screen.getByTestId('open-state')).toHaveTextContent('open');
  expect(screen.getByTestId('context-label')).toHaveTextContent('Tasks');

  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
});

it('registers page context without opening Bruno', () => {
  render(
    <BrunoProvider>
      <RegisteredContextHarness />
    </BrunoProvider>
  );

  expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
  expect(screen.getByTestId('context-label')).toHaveTextContent('Dashboard');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm run test --workspace planevo -- components/bruno/__tests__/BrunoProvider.test.tsx
```

Expected: FAIL because `BrunoProvider`, `useBruno`, and the Bruno types do not exist.

- [ ] **Step 3: Implement the typed context**

Add:

```ts
export type BrunoContextSource =
  | 'sidebar'
  | 'dashboard'
  | 'daily-plan'
  | 'tasks'
  | 'calendar'
  | 'settings'
  | 'unknown';

export interface BrunoPageContext {
  source?: BrunoContextSource;
  page?: string;
  label?: string;
  payload?: Record<string, unknown>;
}
```

Implement `BrunoProvider`, `useBruno`, and `useRegisterBrunoContext` with memoized `openBruno`, `closeBruno`, and `toggleBruno` functions. Preserve the most recent context when opening without a new context.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```bash
npm run test --workspace planevo -- components/bruno/__tests__/BrunoProvider.test.tsx
```

Expected: PASS.

### Task 3: Add the Global Bruno Shell

**Files:**
- Create: `apps/web/components/bruno/BrunoShell.tsx`
- Create: `apps/web/components/bruno/__tests__/BrunoShell.test.tsx`
- Modify: `apps/web/components/dashboard/BrunoChatSidebar.tsx`
- Modify: `apps/web/app/dashboard/layout.tsx`

- [ ] **Step 1: Write failing shell tests**

Mock `BrunoChatSidebar` and verify:

```tsx
it('does not render the chat while closed', () => {
  render(
    <BrunoProvider>
      <BrunoShell />
    </BrunoProvider>
  );

  expect(screen.queryByTestId('bruno-chat-sidebar')).not.toBeInTheDocument();
});

it('renders globally and closes from the overlay', async () => {
  render(
    <BrunoProvider>
      <OpenButton />
      <BrunoShell />
    </BrunoProvider>
  );

  await user.click(screen.getByRole('button', { name: 'Open Bruno' }));
  expect(screen.getByTestId('bruno-chat-sidebar')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Close Bruno overlay' }));
  expect(screen.queryByTestId('bruno-chat-sidebar')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm run test --workspace planevo -- components/bruno/__tests__/BrunoShell.test.tsx
```

Expected: FAIL because `BrunoShell` does not exist.

- [ ] **Step 3: Implement shell and reusable sidebar defaults**

Make `BrunoChatSidebarProps` optional:

```ts
interface BrunoChatSidebarProps {
  onFinish?: () => void;
  isProcessing?: boolean;
  initialMessage?: string;
  assignmentId?: string;
}
```

Default `isProcessing` to `false`. Render the sidebar inside a fixed overlay with an accessible close button and a Framer Motion right-side panel.

- [ ] **Step 4: Mount provider and shell in the dashboard layout**

Wrap the existing dashboard UI:

```tsx
<BrunoProvider>
  <div className="min-h-screen ...">
    <Sidebar />
    <main>{/* existing content */}</main>
    <QuickCaptureModal />
    <BrunoShell />
  </div>
</BrunoProvider>
```

- [ ] **Step 5: Run shell tests and typecheck**

Run:

```bash
npm run test --workspace planevo -- components/bruno/__tests__/BrunoShell.test.tsx
npm run typecheck
```

Expected: both commands exit 0.

### Task 4: Replace Route Navigation With `openBruno()`

**Files:**
- Modify: `apps/web/components/dashboard/Sidebar.tsx`
- Create: `apps/web/components/dashboard/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write a failing sidebar behavior test**

Mock Supabase and the UI store, render `Sidebar` inside `BrunoProvider`, then assert:

```tsx
expect(screen.queryByRole('link', { name: /Ask Bruno/i })).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /Ask Bruno/i }));
expect(screen.getByTestId('bruno-open-state')).toHaveTextContent('open');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm run test --workspace planevo -- components/dashboard/__tests__/Sidebar.test.tsx
```

Expected: FAIL because Ask Bruno is still a link to `/dashboard/chat`.

- [ ] **Step 3: Convert Ask Bruno to a button**

Use `useBruno()` and `usePathname()`:

```tsx
const { openBruno, currentContext } = useBruno();

<button
  type="button"
  onClick={() => {
    openBruno(
      currentContext ?? {
        source: 'sidebar',
        page: pathname,
        label: 'Current page',
      }
    );
    setMobileMenuOpen(false);
  }}
>
  Ask Bruno
</button>
```

- [ ] **Step 4: Run the sidebar test and verify GREEN**

Run:

```bash
npm run test --workspace planevo -- components/dashboard/__tests__/Sidebar.test.tsx
```

Expected: PASS.

### Task 5: Redirect the Legacy Chat Route

**Files:**
- Modify: `apps/web/app/dashboard/chat/page.tsx`

- [ ] **Step 1: Replace the client chat page with a server redirect**

Use:

```tsx
import { redirect } from 'next/navigation';

export default function ChatRedirectPage() {
  redirect('/dashboard');
}
```

- [ ] **Step 2: Verify route compilation**

Run:

```bash
npm run typecheck
```

Expected: exit 0.

### Task 6: Remove Calendar's Duplicate Bruno Instance

**Files:**
- Modify: `apps/web/app/dashboard/calendar/page.tsx`

- [ ] **Step 1: Remove Calendar-local chat state and imports**

Remove `BrunoChatSidebar`, `chatProcessing`, and the `activeSidebarTab` chat option.

- [ ] **Step 2: Keep the right column focused on the task backlog**

Render:

```tsx
<TaskBacklog
  onScheduleAll={handleAutoSchedule}
  onScheduleOne={(task) => {
    toast.info(`Drag "${task.title}" onto the calendar grid to schedule it.`);
  }}
  isProcessing={isProcessing}
  scheduledTaskIds={events.map(event => event.linked_task_id).filter(Boolean) as string[]}
/>
```

- [ ] **Step 3: Run foundation verification**

Run:

```bash
npm run test --workspace planevo -- \
  components/bruno/__tests__/BrunoProvider.test.tsx \
  components/bruno/__tests__/BrunoShell.test.tsx \
  components/dashboard/__tests__/Sidebar.test.tsx
npm run typecheck
npm run build
```

Expected: all tests pass, typecheck exits 0, and the production build exits 0.

