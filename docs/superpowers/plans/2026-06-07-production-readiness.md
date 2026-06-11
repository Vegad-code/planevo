\# Planevo Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Planevo safe to deploy by getting the web app build/test/check pipeline green, hardening launch-critical backend flows, replacing public launch stubs, and verifying the mobile app against the production web API.

**Architecture:** Treat production readiness as a staged release program. Phase 1 fixes objective release blockers with no product redesign. Phase 2 hardens security, billing, cron, integrations, and observability. Phase 3 polishes public UX, onboarding, mobile, and deployment runbooks.

**Tech Stack:** Next.js 16, React 19, TypeScript, ESLint 9, Vitest, Playwright, Supabase, Stripe, Resend, Sentry, PostHog, Expo SDK 54, Jest, RevenueCat.

---

## Release Gates

Planevo is deployable only when all of these commands pass from repo root:

```powershell
npm run check --workspace planevo
npm run typecheck --workspace mobile
npm run test --workspace mobile
npm run doctor --workspace mobile
npm audit --workspaces --audit-level=moderate
```

The final execution pass should also run a staging smoke test against the deployed URL:

```powershell
npm run test:e2e --workspace planevo
```

---

## File Structure

Primary web blocker files:

- `apps/web/components/onboarding/PlanRevealStep.tsx`: fix Framer Motion variant typing and unescaped text.
- `apps/web/app/dashboard/deep-work/page.tsx`: remove pre-declaration access to `timer`.
- `apps/web/app/dashboard/page.tsx`: move `momentumStats` state before async loader usage.
- `apps/web/components/settings/*ManageModal.tsx`: fix function declaration order and effect state patterns.
- `apps/web/components/providers/AppearanceProvider.tsx`: clean hydration/localStorage effect pattern.
- `apps/web/components/ui/ThemeToggle.tsx`: clean mounted state pattern or render safely without effect state.
- `apps/web/app/login/page.tsx`, `apps/web/app/signup/page.tsx`, `apps/web/emails/*.tsx`: escape raw apostrophes/quotes.
- `apps/web/app/api/ai/chat/__tests__/route.test.ts`: repair Supabase admin mock chain.
- `apps/web/app/api/ai/daily-plan/__tests__/route.test.ts`: repair Supabase admin mock chain.
- `apps/web/vitest.setup.ts`: centralize reusable test environment defaults if needed.

Launch trust/legal files:

- `apps/web/app/privacy/page.tsx`: replace pre-launch stub and stale PlanPilot contact addresses.
- `apps/web/app/terms/page.tsx`: replace pre-launch stub and stale PlanPilot contact addresses.
- `apps/web/app/cookies/page.tsx`: replace pre-launch stub and add consent-banner follow-up if analytics cookies are enabled.
- `apps/web/app/page.tsx`: fix mojibake text and align claims with actual v1 behavior.
- `apps/web/components/landing/LandingHeader.tsx`: verify visible nav links and CTA behavior.
- `apps/web/README.md`, `LAUNCH_CHECKLIST.md`: update after final gate results.

Security/backend files:

- `apps/web/lib/auth/origin-guard.ts`: verify allowed-origin defaults and cron bypass behavior.
- `apps/web/lib/auth/get-user.ts`: add tests for Bearer token, cookie auth, and cron token rejection.
- `apps/web/app/api/cron/*/route.ts`: test `CRON_SECRET` protection and failure paths.
- `apps/web/app/api/notifications/push/route.ts`: test cron auth and no-token behavior.
- `apps/web/app/api/stripe/webhook/route.ts`: verify idempotency and subscription status updates.
- `apps/web/app/api/stripe/checkout/route.ts`: verify return path sanitization and active-subscription portal redirect.
- `apps/web/lib/supabase/admin.ts`: keep service-role use server-only.
- `apps/web/lib/env.ts`: create a typed environment validation helper.
- `apps/web/lib/env.test.ts`: test missing and valid environment values.

Mobile files:

- `apps/mobile/app/(tabs)/chat.tsx`: remove production-risky fallback behavior where possible.
- `apps/mobile/app/(tabs)/index.tsx`: keep production API URL guard and add tests if coverage is missing.
- `apps/mobile/__tests__/DailyPlan-test.tsx`: fix React `act(...)` warnings.
- `apps/mobile/__tests__/Chat-test.tsx`: verify production API URL handling.
- `apps/mobile/.env.example`: ensure production variables are documented.
- `apps/mobile/MOBILE_DEVELOPMENT.md`: update release instructions.

---

## Phase 1: Make Web Buildable

### Task 1: Fix Framer Motion TypeScript Blocker

**Files:**
- Modify: `apps/web/components/onboarding/PlanRevealStep.tsx`

- [ ] **Step 1: Inspect the current animation object**

Run:

```powershell
Get-Content apps/web/components/onboarding/PlanRevealStep.tsx
```

Expected: find an object like:

```ts
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.3 } },
};
```

- [ ] **Step 2: Add explicit Framer Motion typing**

Change the import and variant declaration to this pattern:

```ts
import { motion, type Variants } from 'framer-motion';

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', bounce: 0.3 },
  },
};
```

If the file already imports `motion`, only add `type Variants`.

- [ ] **Step 3: Run the focused typecheck**

Run:

```powershell
npm run typecheck --workspace planevo
```

Expected: the `PlanRevealStep.tsx` `Variants` error disappears. Other errors should be handled by later tasks.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/components/onboarding/PlanRevealStep.tsx
git commit -m "fix: type onboarding motion variants"
```

### Task 2: Fix React Compiler Lint Errors From Pre-Declaration Access

**Files:**
- Modify: `apps/web/app/dashboard/deep-work/page.tsx`
- Modify: `apps/web/app/dashboard/page.tsx`
- Modify: `apps/web/components/settings/GoogleCalendarManageModal.tsx`
- Modify: `apps/web/components/settings/NotionManageModal.tsx`
- Modify: `apps/web/components/settings/SlackManageModal.tsx`
- Modify: `apps/web/components/settings/LinearManageModal.tsx`
- Modify: `apps/web/components/settings/LinearConfigModal.tsx`

- [ ] **Step 1: Run quiet lint to confirm the exact errors**

```powershell
Push-Location apps/web
npx eslint . --quiet
Pop-Location
```

Expected: errors include `Cannot access variable before it is declared`.

- [ ] **Step 2: Fix `deep-work/page.tsx` timer closure**

Replace the timer completion callback so it does not close over `timer` before declaration. Use a stable completion handler that accepts elapsed time from the hook if available. If `useDeepWorkTimer` only calls a zero-argument callback, update the hook to pass elapsed time.

Expected target pattern in `apps/web/hooks/use-deep-work-timer.ts`:

```ts
type CompletionHandler = (totalElapsedFocusTime: number) => void;

export function useDeepWorkTimer(duration: number, onComplete?: CompletionHandler) {
  // existing hook internals
  // when complete:
  onComplete?.(totalElapsedFocusTime);
}
```

Expected target pattern in `apps/web/app/dashboard/deep-work/page.tsx`:

```ts
const handleTimerComplete = useCallback((elapsedMinutes: number) => {
  handleComplete(elapsedMinutes);
}, [handleComplete]);

const timer = useDeepWorkTimer(duration, handleTimerComplete);
```

- [ ] **Step 3: Fix `dashboard/page.tsx` state declaration order**

Move this state block above any callbacks/effects that reference `setMomentumStats`:

```ts
const [momentumStats, setMomentumStats] = useState<MomentumStats>({
  focusTimeMinutes: 0,
  tasksCrushed: 0,
  tasksPlanned: 0,
  currentStreak: 0,
});
```

Do not change the `MomentumStats` shape unless TypeScript reports the exact property names differ.

- [ ] **Step 4: Convert modal helper functions to declarations**

In each affected settings modal, convert functions used by `useEffect` from `const fn = async () => {}` to hoisted function declarations before the effect:

```ts
async function fetchAccountSyncStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // keep existing body
}

useEffect(() => {
  if (!isOpen) return;
  void fetchAccountSyncStatus();
  setSyncResult(null);
}, [isOpen]);
```

For modal files that also load calendars/databases/teams, apply the same pattern:

```ts
async function fetchCalendars() {
  setLoadingCalendars(true);
  try {
    // keep existing body
  } finally {
    setLoadingCalendars(false);
  }
}
```

- [ ] **Step 5: Run quiet lint**

```powershell
Push-Location apps/web
npx eslint . --quiet
Pop-Location
```

Expected: pre-declaration errors are gone. Remaining errors are handled in later tasks.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/app/dashboard/deep-work/page.tsx apps/web/app/dashboard/page.tsx apps/web/components/settings/GoogleCalendarManageModal.tsx apps/web/components/settings/NotionManageModal.tsx apps/web/components/settings/SlackManageModal.tsx apps/web/components/settings/LinearManageModal.tsx apps/web/components/settings/LinearConfigModal.tsx apps/web/hooks/use-deep-work-timer.ts
git commit -m "fix: remove pre-declaration hook references"
```

### Task 3: Resolve React Compiler Effect-State Lint Errors

**Files:**
- Modify: `apps/web/app/dashboard/settings/appearance/page.tsx`
- Modify: `apps/web/components/dashboard/ScheduleTimeline.tsx`
- Modify: `apps/web/components/providers/AppearanceProvider.tsx`
- Modify: `apps/web/components/settings/IntegrationsScreen.tsx`
- Modify: `apps/web/components/settings/MemoryControls.tsx`
- Modify: `apps/web/components/ui/ThemeToggle.tsx`

- [ ] **Step 1: Prefer derived initial state for browser-only mounted checks**

For simple mounted guards, replace:

```ts
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
```

with one of these options.

If the component can render a stable fallback:

```ts
const { theme, setTheme, resolvedTheme } = useTheme();
const active = (theme === 'system' ? resolvedTheme : theme) || 'light';
```

If hydration mismatch must be avoided:

```ts
const [mounted, setMounted] = useState(() => typeof window !== 'undefined');
```

Then remove the effect entirely.

- [ ] **Step 2: Defer unavoidable effect state updates**

For effects that must synchronize after mount, move direct state updates into an async microtask:

```ts
useEffect(() => {
  let cancelled = false;

  async function sync() {
    await Promise.resolve();
    if (cancelled) return;
    setItems(unified);
  }

  void sync();
  return () => {
    cancelled = true;
  };
}, [unified]);
```

Use this only where the state is truly derived from props or external browser storage. Prefer `useMemo` for purely derived arrays.

- [ ] **Step 3: Fix `Date.now()` during render**

In `apps/web/app/dashboard/settings/layout.tsx`, move the trial days calculation to the server data loader or memoize from a prop value created before render.

Target pattern:

```ts
const now = new Date();
const daysLeft = Math.ceil((new Date(data.trial_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
```

If the file is a server component, calculate it in the async function body before returning JSX.

- [ ] **Step 4: Run quiet lint**

```powershell
Push-Location apps/web
npx eslint . --quiet
Pop-Location
```

Expected: `react-hooks/set-state-in-effect` and `react-hooks/purity` errors are gone.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/app/dashboard/settings/appearance/page.tsx apps/web/app/dashboard/settings/layout.tsx apps/web/components/dashboard/ScheduleTimeline.tsx apps/web/components/providers/AppearanceProvider.tsx apps/web/components/settings/IntegrationsScreen.tsx apps/web/components/settings/MemoryControls.tsx apps/web/components/ui/ThemeToggle.tsx
git commit -m "fix: satisfy react compiler lint rules"
```

### Task 4: Escape Raw JSX Entities

**Files:**
- Modify: `apps/web/app/login/page.tsx`
- Modify: `apps/web/app/signup/page.tsx`
- Modify: `apps/web/components/onboarding/ConnectCalendarStep.tsx`
- Modify: `apps/web/components/onboarding/PlanRevealStep.tsx`
- Modify: `apps/web/components/onboarding/WelcomeIntentStep.tsx`
- Modify: `apps/web/components/settings/LLMImportForm.tsx`
- Modify: `apps/web/components/settings/MemoryControls.tsx`
- Modify: `apps/web/emails/PlanevoMagicLinkEmail.tsx`
- Modify: `apps/web/emails/PlanevoResetPasswordEmail.tsx`
- Modify: `apps/web/emails/PlanevoWelcomeEmail.tsx`

- [ ] **Step 1: Replace apostrophes and quotes in JSX text**

Use JSX entities in visible text nodes:

```tsx
Don&apos;t
You&apos;re
&quot;example&quot;
```

When the text is already inside a string prop, do not change it:

```tsx
<Button aria-label="Don't change this string prop">
```

- [ ] **Step 2: Run quiet lint**

```powershell
Push-Location apps/web
npx eslint . --quiet
Pop-Location
```

Expected: no `react/no-unescaped-entities` errors remain.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/app/login/page.tsx apps/web/app/signup/page.tsx apps/web/components/onboarding/ConnectCalendarStep.tsx apps/web/components/onboarding/PlanRevealStep.tsx apps/web/components/onboarding/WelcomeIntentStep.tsx apps/web/components/settings/LLMImportForm.tsx apps/web/components/settings/MemoryControls.tsx apps/web/emails/PlanevoMagicLinkEmail.tsx apps/web/emails/PlanevoResetPasswordEmail.tsx apps/web/emails/PlanevoWelcomeEmail.tsx
git commit -m "fix: escape jsx text entities"
```

### Task 5: Verify Full Web Build Gate

**Files:**
- Modify only files required by failures discovered in this task.

- [ ] **Step 1: Run web lint**

```powershell
npm run lint --workspace planevo
```

Expected: exit code `0`. Warnings are acceptable for the first deploy candidate, but any error blocks release.

- [ ] **Step 2: Run web typecheck**

```powershell
npm run typecheck --workspace planevo
```

Expected: exit code `0`.

- [ ] **Step 3: Run web build**

```powershell
npm run build --workspace planevo
```

Expected: exit code `0`, production build completes.

- [ ] **Step 4: Commit any additional fixes**

```powershell
git add apps/web
git commit -m "fix: pass web build gate"
```

---

## Phase 2: Fix Tests And Backend Reliability

### Task 6: Repair AI Route Unit Tests

**Files:**
- Modify: `apps/web/app/api/ai/chat/__tests__/route.test.ts`
- Modify: `apps/web/app/api/ai/daily-plan/__tests__/route.test.ts`
- Modify: `apps/web/vitest.setup.ts` if shared mocks are cleaner.

- [x] **Step 1: Write a reusable Supabase query-chain mock**

Add this helper inside each test file or `vitest.setup.ts`:

```ts
function createQueryBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  Object.assign(builder, {
    select: vi.fn(chain),
    eq: vi.fn(chain),
    is: vi.fn(chain),
    gte: vi.fn(chain),
    lt: vi.fn(chain),
    lte: vi.fn(chain),
    order: vi.fn(chain),
    limit: vi.fn(chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    insert: vi.fn(chain),
    upsert: vi.fn(chain),
    update: vi.fn(chain),
    delete: vi.fn(chain),
    then: undefined,
  });

  return builder;
}
```

If a route awaits the builder directly, add:

```ts
Object.assign(builder, {
  then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
});
```

- [x] **Step 2: Mock `supabaseAdmin.from()` per table**

Use table-specific results:

```ts
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return createQueryBuilder({ data: { id: 'user-1', plan_type: 'free' }, error: null });
      }
      if (table === 'tasks') {
        return createQueryBuilder({ data: [], error: null });
      }
      if (table === 'calendar_events') {
        return createQueryBuilder({ data: [], error: null });
      }
      return createQueryBuilder({ data: [], error: null });
    }),
  },
}));
```

- [x] **Step 3: Run focused tests**

```powershell
Push-Location apps/web
npx vitest run app/api/ai/chat/__tests__/route.test.ts app/api/ai/daily-plan/__tests__/route.test.ts
Pop-Location
```

Expected: both files pass.

- [x] **Step 4: Run all web tests**

```powershell
npm run test --workspace planevo
```

Expected: all web tests pass.

- [x] **Step 5: Commit**

```powershell
git add apps/web/app/api/ai/chat/__tests__/route.test.ts apps/web/app/api/ai/daily-plan/__tests__/route.test.ts apps/web/vitest.setup.ts
git commit -m "test: repair ai route mocks"
```

### Task 7: Add Environment Validation

**Files:**
- Create: `apps/web/lib/env.ts`
- Create: `apps/web/lib/env.test.ts`
- Modify: `apps/web/lib/stripe.ts`
- Modify: `apps/web/lib/email.ts`
- Modify: `apps/web/lib/supabase/admin.ts`

- [x] **Step 1: Add env helper tests**

Create `apps/web/lib/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readRequiredEnv } from './env';

describe('readRequiredEnv', () => {
  it('returns a configured variable', () => {
    expect(readRequiredEnv({ FOO: 'bar' }, 'FOO')).toBe('bar');
  });

  it('throws for a missing variable', () => {
    expect(() => readRequiredEnv({}, 'FOO')).toThrow('Missing required environment variable: FOO');
  });

  it('throws for an empty variable', () => {
    expect(() => readRequiredEnv({ FOO: '   ' }, 'FOO')).toThrow('Missing required environment variable: FOO');
  });
});
```

- [x] **Step 2: Implement env helper**

Create `apps/web/lib/env.ts`:

```ts
export function readRequiredEnv(
  env: Record<string, string | undefined>,
  key: string
) {
  const value = env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
```

- [x] **Step 3: Use helper in server-only clients**

In server-only modules, replace raw non-null assertions with:

```ts
import { readRequiredEnv } from '@/lib/env';

const supabaseUrl = readRequiredEnv(process.env, 'NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = readRequiredEnv(process.env, 'SUPABASE_SERVICE_ROLE_KEY');
```

Do not import `env.ts` into client components unless the variable is explicitly public.

- [x] **Step 4: Run tests**

```powershell
Push-Location apps/web
npx vitest run lib/env.test.ts
Pop-Location
```

Expected: pass.

- [x] **Step 5: Run web check**

```powershell
npm run check --workspace planevo
```

Expected: pass.

- [x] **Step 6: Commit**

```powershell
git add apps/web/lib/env.ts apps/web/lib/env.test.ts apps/web/lib/stripe.ts apps/web/lib/email.ts apps/web/lib/supabase/admin.ts
git commit -m "chore: validate required server environment"
```

### Task 8: Harden Cron And Notification Route Tests

**Files:**
- Create or modify tests near:
  - `apps/web/app/api/cron/weekly-review`
  - `apps/web/app/api/cron/deadline-rescue`
  - `apps/web/app/api/cron/welcome-series`
  - `apps/web/app/api/notifications/push`

- [x] **Step 1: Add unauthorized cron tests**

For each cron route, add this behavior:

```ts
it('rejects requests without CRON_SECRET authorization', async () => {
  process.env.CRON_SECRET = 'test-cron-secret';
  const req = new NextRequest('http://localhost:3000/api/cron/weekly-review');

  const res = await GET(req);
  const body = await res.json();

  expect(res.status).toBe(401);
  expect(body.error).toMatch(/Unauthorized/i);
});
```

Adjust route path and imported handler per file.

- [x] **Step 2: Add authorized smoke tests**

```ts
it('accepts requests with CRON_SECRET authorization', async () => {
  process.env.CRON_SECRET = 'test-cron-secret';
  const req = new NextRequest('http://localhost:3000/api/cron/weekly-review', {
    headers: { authorization: 'Bearer test-cron-secret' },
  });

  const res = await GET(req);

  expect([200, 204]).toContain(res.status);
});
```

Mock Supabase and email/push clients so no network calls occur.

- [x] **Step 3: Run focused cron tests**

```powershell
Push-Location apps/web
npx vitest run app/api/cron app/api/notifications
Pop-Location
```

Expected: pass.

- [x] **Step 4: Commit**

```powershell
git add apps/web/app/api/cron apps/web/app/api/notifications
git commit -m "test: cover cron authorization"
```

### Task 9: Verify Stripe Checkout And Webhook

**Files:**
- Modify: `apps/web/app/api/stripe/webhook/__tests__/route.test.ts`
- Create: `apps/web/app/api/stripe/checkout/route.test.ts` if missing.
- Modify: `apps/web/app/api/stripe/checkout/route.ts` only if tests reveal a bug.
- Modify: `apps/web/app/api/stripe/webhook/route.ts` only if tests reveal a bug.

- [x] **Step 1: Add checkout return-path sanitization test**

```ts
it('falls back to membership page for external return paths', async () => {
  const res = await POST(makeAuthedRequest({
    interval: 'monthly',
    returnPath: 'https://evil.example/phish',
  }));

  expect(res.status).toBe(200);
  expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      success_url: expect.stringContaining('/dashboard/settings/membership?checkout=success'),
    })
  );
});
```

- [x] **Step 2: Add webhook idempotency test**

```ts
it('skips already processed webhook events', async () => {
  mockWebhookEventAlreadyExists('evt_existing');

  const res = await POST(makeStripeWebhookRequest({ id: 'evt_existing' }));

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ received: true, duplicate: true });
});
```

Use the existing webhook test helper names if they differ.

- [x] **Step 3: Run Stripe tests**

```powershell
Push-Location apps/web
npx vitest run app/api/stripe lib/__tests__/stripe.test.ts
Pop-Location
```

Expected: pass.

- [x] **Step 4: Commit**

```powershell
git add apps/web/app/api/stripe apps/web/lib/__tests__/stripe.test.ts
git commit -m "test: harden stripe release paths"
```

---

## Phase 3: Launch Trust, UX, And Copy

### Task 10: Replace Legal Stubs And Stale Contact Info

**Files:**
- Modify: `apps/web/app/privacy/page.tsx`
- Modify: `apps/web/app/terms/page.tsx`
- Modify: `apps/web/app/cookies/page.tsx`

- [x] **Step 1: Remove pre-launch draft banners and comments**

Delete comments that say:

```ts
// TODO (pre-launch): Replace this stub...
```

Remove visible banners that say:

```tsx
Draft — Replace with Termly before public launch
```

- [x] **Step 2: Replace PlanPilot addresses with Planevo addresses**

Use:

```tsx
<a href="mailto:privacy@planevo.co" className="text-brand-600 underline">privacy@planevo.co</a>
<a href="mailto:legal@planevo.co" className="text-brand-600 underline">legal@planevo.co</a>
```

- [x] **Step 3: Add clear AI/data wording**

Privacy page must state:

```tsx
Planevo uses AI providers to generate plans and responses from the tasks, calendar events, preferences, and messages you choose to provide. We do not sell personal data.
```

- [x] **Step 4: Run lint**

```powershell
npm run lint --workspace planevo
```

Expected: pass.

- [x] **Step 5: Commit**

```powershell
git add apps/web/app/privacy/page.tsx apps/web/app/terms/page.tsx apps/web/app/cookies/page.tsx
git commit -m "docs: replace launch legal stubs"
```

### Task 11: Fix Mojibake And Public Copy Claims

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/landing/LandingHeader.tsx`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Search for mojibake**

```powershell
rg -n "â|Â|ð|ï|�" apps/web/app apps/web/components apps/web/README.md
```

Expected: list of corrupted text.

- [ ] **Step 2: Replace common corrupt strings**

Use ASCII-safe replacements:

```tsx
"Introducing Planevo · A shame-free daily planner" -> "Introducing Planevo - A shame-free daily planner"
"Daily Plan â€”" -> "Daily Plan -"
"Â·" -> "-"
"â†’" -> "->"
```

Prefer simple ASCII unless the file already intentionally uses Unicode cleanly.

- [ ] **Step 3: Align landing claims with v1**

Replace overpromising copy:

```tsx
Planevo brings your Canvas, calendar, and to-dos into one Daily Plan - then Bruno helps you adjust when life gets in the way.
```

Avoid claiming fully automatic reshuffling unless the feature is tested and enabled in production.

- [ ] **Step 4: Run lint and typecheck**

```powershell
npm run lint --workspace planevo
npm run typecheck --workspace planevo
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/app/page.tsx apps/web/components/landing/LandingHeader.tsx apps/web/README.md
git commit -m "fix: clean public copy encoding"
```

### Task 12: Add User-Facing Error States For Critical Flows

**Files:**
- Modify: `apps/web/app/onboarding/page.tsx`
- Modify: `apps/web/app/dashboard/daily-plan/page.tsx`
- Modify: `apps/web/components/dashboard/BrunoChatSidebar.tsx`
- Modify: `apps/web/components/settings/MembershipActions.tsx`

- [ ] **Step 1: Verify existing error display**

Run targeted searches:

```powershell
rg -n "catch|error|toast|Alert|sonner" apps/web/app/onboarding apps/web/app/dashboard/daily-plan apps/web/components/dashboard/BrunoChatSidebar.tsx apps/web/components/settings/MembershipActions.tsx
```

- [ ] **Step 2: Ensure each failed async action shows a clear retryable message**

Use this message pattern:

```tsx
toast.error('Planevo could not complete that action. Please try again.');
```

For billing:

```tsx
toast.error('Could not open billing. Please refresh and try again.');
```

For AI:

```tsx
toast.error('Bruno could not generate a response. Please try again in a moment.');
```

- [ ] **Step 3: Run lint**

```powershell
npm run lint --workspace planevo
```

Expected: pass.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/app/onboarding/page.tsx apps/web/app/dashboard/daily-plan/page.tsx apps/web/components/dashboard/BrunoChatSidebar.tsx apps/web/components/settings/MembershipActions.tsx
git commit -m "fix: improve critical flow error states"
```

---

## Phase 4: Mobile Release Confidence

### Task 13: Clean Mobile Test Warnings

**Files:**
- Modify: `apps/mobile/__tests__/DailyPlan-test.tsx`
- Modify: `apps/mobile/__tests__/Chat-test.tsx`

- [ ] **Step 1: Reproduce warning**

```powershell
npm run test --workspace mobile
```

Expected: tests pass but `act(...)` warnings appear.

- [ ] **Step 2: Wrap async render updates**

Use this pattern:

```tsx
import { act, render, waitFor } from '@testing-library/react-native';

await act(async () => {
  render(<DailyPlanScreen />);
});

await waitFor(() => {
  expect(screen.getByText(/Daily Plan/i)).toBeTruthy();
});
```

If the test already renders outside `act`, move render and mocked promise resolution into `act`.

- [ ] **Step 3: Re-run mobile tests**

```powershell
npm run test --workspace mobile
```

Expected: tests pass without React `act(...)` warnings.

- [ ] **Step 4: Commit**

```powershell
git add apps/mobile/__tests__/DailyPlan-test.tsx apps/mobile/__tests__/Chat-test.tsx
git commit -m "test: clean mobile async render warnings"
```

### Task 14: Verify Mobile Production API Guard

**Files:**
- Modify: `apps/mobile/app/(tabs)/chat.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/.env.example`
- Modify: `apps/mobile/MOBILE_DEVELOPMENT.md`

- [ ] **Step 1: Confirm production guard exists**

Search:

```powershell
rg -n "EXPO_PUBLIC_API_URL|localhost:3000|__DEV__" apps/mobile/app apps/mobile/lib
```

Expected: localhost fallback is allowed only under `__DEV__`.

- [ ] **Step 2: Enforce no localhost fallback in production**

Use this pattern in mobile API calls:

```ts
let apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  if (__DEV__) {
    apiUrl = 'http://localhost:3000';
  } else {
    throw new Error('EXPO_PUBLIC_API_URL is required in production builds.');
  }
}
```

- [ ] **Step 3: Update env example**

Ensure `apps/mobile/.env.example` includes:

```dotenv
EXPO_PUBLIC_API_URL=https://planevo.co
EXPO_PUBLIC_WEB_URL=https://planevo.co
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-public-sdk-key
```

- [ ] **Step 4: Run mobile gates**

```powershell
npm run typecheck --workspace mobile
npm run test --workspace mobile
npm run doctor --workspace mobile
```

Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/mobile/app/(tabs)/chat.tsx apps/mobile/app/(tabs)/index.tsx apps/mobile/.env.example apps/mobile/MOBILE_DEVELOPMENT.md
git commit -m "fix: enforce mobile production api configuration"
```

---

## Phase 5: Security, Audit, And Deployment

### Task 15: Resolve Dependency Audit Findings

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify workspace package files only if version changes require it.

- [ ] **Step 1: Capture current audit**

```powershell
npm audit --workspaces --audit-level=moderate
```

Expected: current `postcss` and `uuid` moderate findings are listed.

- [ ] **Step 2: Try safe audit fix first**

```powershell
npm audit fix
```

Expected: package lock updates without forced major downgrades.

- [ ] **Step 3: Re-run audit**

```powershell
npm audit --workspaces --audit-level=moderate
```

Expected: zero moderate+ findings, or only findings that require framework upgrades.

- [ ] **Step 4: If findings remain, document mitigation**

Add a section to `LAUNCH_CHECKLIST.md`:

```md
### Dependency Audit Exceptions

- `postcss` via Next/Expo: no safe non-breaking upgrade available from current dependency tree. Mitigation: no user-authored CSS stringification path is exposed; revisit after Next/Expo patch release.
- `uuid` via Expo tooling: development/build-time dependency path. Mitigation: no production server runtime exposure; revisit after Expo patch release.
```

- [ ] **Step 5: Run full gates**

```powershell
npm run check --workspace planevo
npm run typecheck --workspace mobile
npm run test --workspace mobile
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json LAUNCH_CHECKLIST.md
git commit -m "chore: resolve dependency audit findings"
```

### Task 16: Remove Local Secret Files From Workspace Root

**Files:**
- Modify: `.gitignore` only if needed.
- Do not commit secret files.

- [ ] **Step 1: Verify sensitive files are untracked**

```powershell
git ls-files gcp-service-account.json .claude.json .claude.json.backup
```

Expected: no output.

- [ ] **Step 2: Confirm ignore rules**

```powershell
Get-Content .gitignore
```

Expected: includes:

```gitignore
gcp-service-account.json
.claude.json
.claude.json.backup
.env
.env.*
```

- [ ] **Step 3: Move secrets manually outside repo**

Because this is destructive/moves local credentials, do not automate without explicit user approval. Ask the user to move `gcp-service-account.json` to a secure non-repo location and rotate it if it may have been shared.

- [ ] **Step 4: Commit ignore updates if changed**

```powershell
git add .gitignore
git commit -m "chore: ignore local credential files"
```

### Task 17: Staging Deployment Smoke Test

**Files:**
- Modify: `LAUNCH_CHECKLIST.md`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Run full local web gate**

```powershell
npm run check --workspace planevo
```

Expected: pass.

- [ ] **Step 2: Run full mobile gate**

```powershell
npm run typecheck --workspace mobile
npm run test --workspace mobile
npm run doctor --workspace mobile
```

Expected: pass.

- [ ] **Step 3: Deploy staging**

Use the project’s normal Vercel flow. If using Vercel CLI:

```powershell
vercel --prebuilt
```

Expected: staging URL is produced.

- [ ] **Step 4: Run Playwright against staging or local production**

If staging URL is available:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://your-staging-url.vercel.app"
npm run test:e2e --workspace planevo
```

If using local production:

```powershell
npm run start --workspace planevo
npm run test:e2e --workspace planevo
```

Expected: e2e smoke tests pass.

- [ ] **Step 5: Manually verify critical flows**

Verify:

- Landing page loads with clean copy.
- Signup/login works.
- Onboarding completes.
- Daily Plan generates or shows a graceful error when AI is unavailable.
- Bruno Chat streams a response.
- Stripe checkout opens with the correct price.
- Billing portal opens for an active test customer.
- Google Calendar connect/callback works.
- Notifications test route works for a test user.
- Cron routes reject missing secret and accept valid secret.
- Account deletion flow handles Stripe and Supabase cleanup in test mode.

- [ ] **Step 6: Update launch checklist**

Mark completed gates in `LAUNCH_CHECKLIST.md` and add the staging URL and date:

```md
### Staging Verification

- Date: 2026-06-07
- URL: https://your-staging-url.vercel.app
- Web check: passed
- Mobile check: passed
- E2E smoke: passed
```

- [ ] **Step 7: Commit**

```powershell
git add LAUNCH_CHECKLIST.md apps/web/README.md
git commit -m "docs: record staging release verification"
```

---

## Execution Order

1. Phase 1 must happen first. Do not work on polish while the web build is red.
2. Phase 2 is next because tests and backend safety are the difference between “builds” and “safe to deploy.”
3. Phase 3 can be parallelized after Phase 1 is green.
4. Phase 4 can be parallelized after the web API tests are green.
5. Phase 5 is final release hardening and staging verification.

---

## Final Definition Of Done

- [ ] `npm run check --workspace planevo` passes.
- [ ] `npm run typecheck --workspace mobile` passes.
- [ ] `npm run test --workspace mobile` passes without React `act(...)` warnings.
- [ ] `npm run doctor --workspace mobile` passes.
- [ ] `npm audit --workspaces --audit-level=moderate` passes or documented exceptions are accepted.
- [ ] Legal pages no longer show draft/pre-launch banners.
- [ ] Public copy has no mojibake artifacts.
- [ ] Staging deployment smoke test is complete.
- [ ] `LAUNCH_CHECKLIST.md` reflects the true release status.

