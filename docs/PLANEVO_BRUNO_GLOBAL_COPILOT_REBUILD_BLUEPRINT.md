# Planevo Bruno Global Copilot — Full Rebuild Blueprint for Codex `/goal`

> **Status: Partially shipped (June 2026).** Global Bruno dock, propose→confirm→execute, and page context may be live. Treat uncompleted checklist items as historical. Current engineering SSOT: [`CLAUDE.md`](../../CLAUDE.md).

## Read This First

This document is a full rebuild blueprint for recreating the Bruno web-app integration from the ground up after reverting the GitHub repo to an earlier commit.

The previous integration work included a global Bruno shell, page-aware context, suggested actions, action proposal cards, confirmed `CREATE_TASK` execution, idempotency, fallback task breakdown generation, and fixes for multiple bugs caused by the prior agent losing context.

Use this document as the source of truth for Codex.

This is not a small patch. It is a complete staged rebuild plan.

The main product direction is:

```txt
Bruno is not a page.
Bruno is not only a Calendar sidebar.
Bruno is a global Planevo copilot layer.
```

The key safety rule is:

```txt
Model proposes.
User confirms.
Server validates.
Database writes.
UI reports success.
```

Do not skip that rule.

---

# 0. Codex `/goal` Prompt

Paste this into Codex as the first `/goal` prompt.

```txt
/goal
You are rebuilding Planevo’s Bruno Global Copilot integration from a reverted GitHub commit.

Read the attached Markdown blueprint completely before editing code.

Product goal:
Bruno should become a global, context-aware AI copilot inside the Planevo web app. Bruno should open from anywhere in the dashboard, understand the current page context, suggest useful actions, render proposed app actions as confirmable UI cards, and only mutate data after explicit user confirmation.

Do not build Bruno as a separate page.
Do not make Bruno only work inside Calendar.
Do not let Bruno directly mutate tasks/calendar/daily-plan data from model output.
Do not show hidden system events as visible user chat messages.
Do not enable dangerous tools before the safe CREATE_TASK flow is complete.

Core safety contract:
Model proposes.
User confirms.
Server validates.
Database writes.
UI reports success.

Rebuild in phases:
1. Inspect current repo first.
2. Add global BrunoProvider and BrunoShell.
3. Replace sidebar Ask Bruno route/navigation with openBruno().
4. Add page-aware context registration and context banner.
5. Add page-aware suggested actions.
6. Add action proposal types, registry, and BrunoActionProposalCard.
7. Add Vercel AI SDK propose_action tool as proposal-only.
8. Add confirmed CREATE_TASK execution route only.
9. Add idempotency and audit logging for CREATE_TASK.
10. Add deterministic fallback for assignment breakdowns when the model fails to call propose_action.
11. Polish multiple CREATE_TASK cards into compact grouped UI.
12. Only after all tests pass, consider future mutation tools.

Use Vercel AI SDK tool rendering patterns. Modern AI SDK chat UI often uses message.parts and tool parts named tool-{toolName}, such as tool-propose_action. Inspect the installed AI SDK version in this repo before assuming exact API shape.

References to study:
- vercel/ai for AI SDK tool calling, useChat, streamText, generateObject, and message.parts patterns.
- vercel/chatbot for production Next.js + AI SDK chat architecture.
- AI SDK docs for chatbot tool usage and human-in-the-loop tools.
- AI Elements confirmation component for inspiration only.
- assistant-ui and CopilotKit as optional future references, not required dependencies.

Important:
If Bruno is asked “Break my AP World DBQ essay into smaller tasks and make it realistic for tonight,” the user must see 3–6 visible CREATE_TASK proposal cards with Confirm buttons. A plain text task list is a failure.

Proceed phase by phase. After each phase, run typecheck/build if available and report files changed, behavior, and tests.
```

---

# 1. Product Intent

Planevo is a student-first AI daily planner. Bruno is the academic planning copilot.

Bruno should help users:

- plan schoolwork
- recover when they fall behind
- break vague assignments into concrete tasks
- create tasks safely
- eventually reschedule tasks, create time blocks, update daily plans, and reason over Calendar/Canvas context

Bruno must feel embedded in Planevo, not bolted on.

## Correct Bruno Behavior

Bruno should:

1. Open globally from any dashboard page.
2. Know what page the user is on.
3. Show suggested actions based on page context.
4. Convert user intent into proposed actions.
5. Render proposed actions as UI cards.
6. Require confirmation before writes.
7. Use the app’s existing authenticated Supabase patterns.
8. Refresh affected data after writes.
9. Never show internal events as chat messages.
10. Never claim an action happened unless the app confirmed it.

## Incorrect Bruno Behavior

Do not allow these:

```txt
- Sidebar Ask Bruno navigates to a blank page.
- Bruno only works in Calendar.
- Bruno returns only a text list when the user wants task cards.
- Bruno directly writes tasks from model tool calls.
- Bruno modifies Calendar/daily plan without confirmation.
- Bruno shows SYSTEM NOTIFICATION as a visible orange user bubble.
- Bruno auto-replies after every Confirm click.
- Prompt-only enforcement with no deterministic fallback.
```

---

# 2. External References / GitHub Repos / Docs

Use these references.

## 2.1 Primary technical reference: Vercel AI SDK

Repository:

```txt
https://github.com/vercel/ai
```

Use for:

- `useChat`
- `streamText`
- `tool`
- `generateObject`
- `message.parts`
- tool calls
- human-in-the-loop UI
- structured generation
- chat state integration

Important pattern:

```tsx
message.parts.map((part) => {
  switch (part.type) {
    case "text":
      return <TextPart text={part.text} />;

    case "tool-propose_action":
      return <BrunoActionProposalCard proposal={toProposal(part)} />;

    default:
      return null;
  }
});
```

Do not assume `message.toolInvocations` is always the correct shape. Inspect the installed AI SDK version.

Modern AI SDK can represent tool calls as `message.parts` with tool part types like:

```txt
tool-{toolName}
```

For this project:

```txt
tool-propose_action
```

## 2.2 Full Next.js reference app: Vercel Chatbot

Repository:

```txt
https://github.com/vercel/chatbot
```

Use for:

- production chat structure
- Next.js App Router setup
- persistence patterns
- AI SDK integration
- tool rendering
- auth-friendly architecture
- component separation

Do not blindly copy the entire repo. Use it as a structure reference.

## 2.3 Official AI SDK Chatbot Tool Usage docs

Docs:

```txt
https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
```

Use for:

- tools inside `useChat`
- server-side tools
- client-side/user-interaction tools
- confirmation dialog patterns
- tool calls integrated into chat messages

## 2.4 AI SDK Core Tool Calling docs

Docs:

```txt
https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
```

Use for:

- how model tool calls and tool results work
- generative UI patterns
- tool call/result contract

## 2.5 AI Elements

Docs:

```txt
https://elements.ai-sdk.dev/
https://elements.ai-sdk.dev/components/confirmation
```

Use for:

- confirmation UI inspiration
- card/action component inspiration
- not required as dependency

## 2.6 assistant-ui

Repository:

```txt
https://github.com/assistant-ui/assistant-ui
```

Use for future inspiration only:

- production-grade AI chat UI
- polished React chat components
- AI SDK integrations

Do not install this in the first rebuild unless absolutely needed. The app already has Bruno components.

## 2.7 CopilotKit

Repository:

```txt
https://github.com/CopilotKit/CopilotKit
```

Use for future inspiration only:

- frontend agents
- app context
- human-in-the-loop agentic UI
- app actions

Do not install this in the first rebuild. Planevo should first stabilize its own Bruno architecture with Vercel AI SDK.

---

# 3. Target File Structure

Expected new/modified files after full rebuild.

```txt
apps/web/
  app/
    dashboard/
      layout.tsx
      page.tsx
      daily-plan/page.tsx
      tasks/page.tsx
      calendar/page.tsx
      settings/page.tsx
      chat/page.tsx
    api/
      ai/
        chat/route.ts
      bruno/
        actions/
          execute/route.ts
        fallback/
          breakdown/route.ts

  components/
    bruno/
      BrunoProvider.tsx
      BrunoShell.tsx
      BrunoContextBanner.tsx
      BrunoSuggestedActions.tsx
      BrunoActionProposalCard.tsx
      BrunoProposalGroup.tsx              # optional but recommended for compact grouped cards
    dashboard/
      Sidebar.tsx
      BrunoChatSidebar.tsx

  lib/
    bruno/
      types.ts
      context.ts                          # optional
      tools/
        types.ts
        registry.ts
        schemas.ts                        # optional
        action-parser.ts                  # optional
        fallback.ts                       # optional helper
```

The agent must inspect the actual repo before creating names. If the repo already has equivalent files, reuse/refactor them.

---

# 4. Phase 0 — Initial Repo Inspection

Before coding, Codex must inspect:

```txt
apps/web/package.json
apps/web/app/dashboard/layout.tsx
apps/web/components/dashboard/Sidebar.tsx
apps/web/components/dashboard/BrunoChatSidebar.tsx
apps/web/app/api/ai/chat/route.ts
existing Supabase server clients
existing auth helper functions
existing task creation hooks/actions
existing task table schema/types
existing bruno logs/table usage
```

Run:

```bash
npm run typecheck
npm run build
```

or the repo’s actual equivalents.

If there is a React version mismatch, fix it before feature work.

Bad mismatch observed previously:

```txt
react:      19.2.7
react-dom:  19.2.0
```

Fix pattern:

```json
{
  "dependencies": {
    "react": "19.2.7",
    "react-dom": "19.2.7"
  }
}
```

Use the correct version for the current project. The rule is exact match.

---

# 5. Phase 1 — Global Bruno Provider + Shell

## Goal

Bruno opens globally from the dashboard sidebar and is no longer a blank route or Calendar-only feature.

## New type file

Create:

```txt
apps/web/lib/bruno/types.ts
```

Example:

```ts
export type BrunoContextSource =
  | "sidebar"
  | "dashboard"
  | "daily-plan"
  | "tasks"
  | "calendar"
  | "settings"
  | "unknown";

export type BrunoPageContext = {
  source?: BrunoContextSource;
  page?: string;
  label?: string;
  payload?: Record<string, unknown>;
};

export type BrunoContextType = {
  isOpen: boolean;
  openBruno: (context?: BrunoPageContext) => void;
  closeBruno: () => void;
  toggleBruno: (context?: BrunoPageContext) => void;
  currentContext: BrunoPageContext | null;
  setCurrentContext: (context: BrunoPageContext) => void;
  activeThreadId?: string | null;
  setActiveThreadId?: (threadId: string | null) => void;
};
```

## BrunoProvider

Create:

```txt
apps/web/components/bruno/BrunoProvider.tsx
```

Important: it must be a client component.

Example:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BrunoContextType, BrunoPageContext } from "@/lib/bruno/types";

const BrunoContext = createContext<BrunoContextType | null>(null);

export function BrunoProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState<BrunoPageContext | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const openBruno = useCallback((context?: BrunoPageContext) => {
    if (context) setCurrentContext(context);
    setIsOpen(true);
  }, []);

  const closeBruno = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleBruno = useCallback((context?: BrunoPageContext) => {
    if (context) setCurrentContext(context);
    setIsOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openBruno,
      closeBruno,
      toggleBruno,
      currentContext,
      setCurrentContext,
      activeThreadId,
      setActiveThreadId,
    }),
    [isOpen, openBruno, closeBruno, toggleBruno, currentContext, activeThreadId]
  );

  return <BrunoContext.Provider value={value}>{children}</BrunoContext.Provider>;
}

export function useBruno() {
  const context = useContext(BrunoContext);

  if (!context) {
    throw new Error("useBruno must be used inside BrunoProvider");
  }

  return context;
}

export function useRegisterBrunoContext(context: BrunoPageContext) {
  const { setCurrentContext } = useBruno();

  useEffect(() => {
    setCurrentContext(context);
  }, [setCurrentContext, context.source, context.page, context.label]);
}
```

If `payload` changes often, do not put raw objects directly in the dependency array unless memoized.

## BrunoShell

Create:

```txt
apps/web/components/bruno/BrunoShell.tsx
```

Example:

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useBruno } from "@/components/bruno/BrunoProvider";
import BrunoChatSidebar from "@/components/dashboard/BrunoChatSidebar";

export function BrunoShell() {
  const { isOpen, closeBruno } = useBruno();

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <button
            aria-label="Close Bruno overlay"
            className="absolute inset-0 bg-black/30 pointer-events-auto"
            onClick={closeBruno}
          />

          <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute right-0 top-0 h-full w-full max-w-[420px] pointer-events-auto border-l border-white/10 bg-[#0b0b0d] shadow-2xl"
          >
            <BrunoChatSidebar />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
```

Adapt class names to Planevo’s existing design.

## Dashboard layout

Modify:

```txt
apps/web/app/dashboard/layout.tsx
```

Pattern:

```tsx
import { BrunoProvider } from "@/components/bruno/BrunoProvider";
import { BrunoShell } from "@/components/bruno/BrunoShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrunoProvider>
      <div className="dashboard-shell">
        <Sidebar />
        <main>{children}</main>
        <BrunoShell />
      </div>
    </BrunoProvider>
  );
}
```

If the layout is a server component, it can render client components. Do not call client hooks directly in the server layout.

## Sidebar button

Modify:

```txt
apps/web/components/dashboard/Sidebar.tsx
```

Bad pattern:

```tsx
<Link href="/dashboard/chat">Ask Bruno</Link>
```

or:

```tsx
router.push("/dashboard/chat");
```

Correct pattern:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useBruno } from "@/components/bruno/BrunoProvider";

function AskBrunoButton() {
  const pathname = usePathname();
  const { openBruno, currentContext } = useBruno();

  return (
    <button
      type="button"
      onClick={() =>
        openBruno(
          currentContext ?? {
            source: "sidebar",
            page: pathname,
            label: "Current page",
          }
        )
      }
    >
      Ask Bruno
    </button>
  );
}
```

## `/dashboard/chat` route

Do not leave a blank page.

Safer route:

```tsx
import { redirect } from "next/navigation";

export default function ChatRedirectPage() {
  redirect("/dashboard");
}
```

Do not delete the route until all references are removed.

## Phase 1 acceptance test

```txt
- Open /dashboard.
- Click Ask Bruno.
- Bruno panel opens.
- Navigate to /dashboard/tasks.
- Ask Bruno opens.
- /dashboard/chat does not show a blank page.
```

---

# 6. Phase 2 — Page-Aware Context

## Goal

Bruno knows the current page.

## Context registration examples

Dashboard page:

```tsx
"use client";

import { useRegisterBrunoContext } from "@/components/bruno/BrunoProvider";

export default function DashboardPage() {
  useRegisterBrunoContext({
    source: "dashboard",
    page: "/dashboard",
    label: "Dashboard",
  });

  return <DashboardContent />;
}
```

Tasks page:

```tsx
useRegisterBrunoContext({
  source: "tasks",
  page: "/dashboard/tasks",
  label: "Tasks",
});
```

Daily Plan:

```tsx
useRegisterBrunoContext({
  source: "daily-plan",
  page: "/dashboard/daily-plan",
  label: "Daily Plan",
});
```

Calendar dynamic context:

```tsx
import { useMemo } from "react";

const contextLabel = useMemo(() => {
  if (activeView === "week") {
    return `Calendar • Week of ${format(startOfWeek(selectedDate), "MMM d")}`;
  }

  if (activeView === "month") {
    return `Calendar • ${format(selectedDate, "MMMM yyyy")}`;
  }

  return `Calendar • ${format(selectedDate, "MMM d")}`;
}, [activeView, selectedDate]);

useRegisterBrunoContext({
  source: "calendar",
  page: "/dashboard/calendar",
  label: contextLabel,
  payload: {
    activeView,
    selectedDate: selectedDate.toISOString(),
  },
});
```

## Common Gemini bug: `React is not defined`

Bad:

```tsx
const contextLabel = React.useMemo(() => {
  // ...
}, []);
```

If `React` is not imported, this throws.

Fix option 1:

```tsx
import React from "react";
```

Fix option 2 preferred:

```tsx
import { useMemo } from "react";

const contextLabel = useMemo(() => {
  // ...
}, []);
```

## Context banner

Create:

```txt
apps/web/components/bruno/BrunoContextBanner.tsx
```

Example:

```tsx
"use client";

import { useBruno } from "@/components/bruno/BrunoProvider";

export function BrunoContextBanner() {
  const { currentContext } = useBruno();
  const label = currentContext?.label ?? "Planevo";

  return (
    <div className="mx-4 mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
      Bruno is looking at: <span className="text-white">{label}</span>
    </div>
  );
}
```

Render it inside `BrunoShell` or `BrunoChatSidebar`.

## Backend pageContext payload

In `BrunoChatSidebar.tsx`, send pageContext with the chat request.

Pattern depends on AI SDK version. Concept:

```ts
sendMessage(
  { text: userMessage },
  {
    body: {
      pageContext: currentContext,
    },
  }
);
```

or:

```ts
append(
  { role: "user", content: userMessage },
  {
    body: {
      pageContext: currentContext,
    },
  }
);
```

Inspect current `useChat` API.

In route:

```ts
const body = await request.json();

const pageContextSchema = z
  .object({
    source: z.string().optional(),
    page: z.string().optional(),
    label: z.string().optional(),
    payload: z.record(z.unknown()).optional(),
  })
  .optional();

const pageContext = pageContextSchema.parse(body.pageContext);
```

Inject into system prompt:

```ts
const pageContextBlock = pageContext
  ? `
CURRENT PLANEVO CONTEXT:
- Source: ${pageContext.source ?? "unknown"}
- Page: ${pageContext.page ?? "unknown"}
- Label: ${pageContext.label ?? "Planevo"}
`
  : "";
```

---

# 7. Phase 3 — Suggested Actions

## Goal

Bruno should show page-aware action buttons.

Create:

```txt
apps/web/components/bruno/BrunoSuggestedActions.tsx
```

Example:

```tsx
"use client";

import { useBruno } from "@/components/bruno/BrunoProvider";

type SuggestedAction = {
  label: string;
  prompt: string;
};

const ACTIONS: Record<string, SuggestedAction[]> = {
  dashboard: [
    {
      label: "Review my week",
      prompt: "Review my week and tell me what I should focus on first.",
    },
    {
      label: "Find my riskiest day",
      prompt:
        "Look at my current Planevo context and help me identify the riskiest day or biggest planning problem this week.",
    },
    {
      label: "What should I do first?",
      prompt: "Based on where I am in Planevo, help me decide what I should do first.",
    },
  ],
  "daily-plan": [
    {
      label: "I'm behind",
      prompt:
        "I'm behind on my daily plan. Help me recover the rest of today without making the plan feel overwhelming.",
    },
    {
      label: "Rebuild today",
      prompt: "Help me rebuild today's plan into a realistic version I can still finish.",
    },
    {
      label: "Make this lighter",
      prompt:
        "Make today's plan feel lighter and more realistic while keeping the most important work protected.",
    },
  ],
  tasks: [
    {
      label: "Prioritize tasks",
      prompt: "Help me prioritize my tasks by urgency, importance, and effort.",
    },
    {
      label: "Break this down",
      prompt: "Help me break down my current task list into smaller next actions.",
    },
    {
      label: "Estimate time",
      prompt: "Help me estimate how long my tasks might take and identify what is too vague.",
    },
  ],
  calendar: [
    {
      label: "Find study time",
      prompt: "Help me find realistic study time in my current calendar view.",
    },
    {
      label: "Fix conflicts",
      prompt:
        "Look at my current calendar context and help me reason through any scheduling conflicts or overloaded days.",
    },
    {
      label: "Plan around work",
      prompt: "Help me plan my schoolwork around my fixed events and work schedule.",
    },
  ],
};

const FALLBACK_ACTIONS: SuggestedAction[] = [
  {
    label: "Help me plan",
    prompt: "Help me make a realistic plan based on where I am in Planevo.",
  },
  {
    label: "What matters most?",
    prompt: "Help me figure out what matters most right now.",
  },
  {
    label: "Recover my schedule",
    prompt: "Help me recover my schedule without shame or overplanning.",
  },
];

export function BrunoSuggestedActions({
  onSelectAction,
}: {
  onSelectAction: (prompt: string) => void;
}) {
  const { currentContext } = useBruno();
  const source = currentContext?.source ?? "fallback";
  const actions = ACTIONS[source] ?? FALLBACK_ACTIONS;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onSelectAction(action.prompt)}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/80 hover:bg-white/[0.07]"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

## Shared submit function

In `BrunoChatSidebar.tsx`, do not duplicate send logic.

Good pattern:

```ts
async function submitPrompt(prompt: string, event?: React.FormEvent) {
  event?.preventDefault();

  const trimmed = prompt.trim();
  if (!trimmed || isLoading) return;

  // existing send logic
}
```

Then:

```ts
function handleSubmit(event: React.FormEvent) {
  submitPrompt(input, event);
}
```

Suggested action:

```tsx
<BrunoSuggestedActions onSelectAction={(prompt) => submitPrompt(prompt)} />
```

---

# 8. Phase 4A — Action Proposal Types + Registry

## Goal

Introduce a structured action language.

Create:

```txt
apps/web/lib/bruno/tools/types.ts
```

Example:

```ts
export type BrunoActionType =
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "RESCHEDULE_TASK"
  | "CREATE_TIME_BLOCK"
  | "UPDATE_DAILY_PLAN"
  | "EXPLAIN_PLAN"
  | "NO_ACTION";

export type BrunoActionStatus =
  | "draft"
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "executed"
  | "failed";

export type BrunoRiskLevel = "low" | "medium" | "high";

export type BrunoActionProposal = {
  id: string;
  type: BrunoActionType;
  title: string;
  description: string;
  status: BrunoActionStatus;
  riskLevel: BrunoRiskLevel;
  requiresConfirmation: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type BrunoToolDefinition = {
  type: BrunoActionType;
  label: string;
  description: string;
  riskLevel: BrunoRiskLevel;
  requiresConfirmation: boolean;
  executable: boolean;
};
```

Create registry:

```txt
apps/web/lib/bruno/tools/registry.ts
```

Example:

```ts
import type { BrunoActionType, BrunoToolDefinition } from "./types";

export const brunoActionRegistry: Record<BrunoActionType, BrunoToolDefinition> = {
  CREATE_TASK: {
    type: "CREATE_TASK",
    label: "Create task",
    description: "Create a new task in Planevo.",
    riskLevel: "low",
    requiresConfirmation: true,
    executable: false, // turns true in Phase 4C only
  },
  UPDATE_TASK: {
    type: "UPDATE_TASK",
    label: "Update task",
    description: "Update an existing task.",
    riskLevel: "medium",
    requiresConfirmation: true,
    executable: false,
  },
  RESCHEDULE_TASK: {
    type: "RESCHEDULE_TASK",
    label: "Reschedule task",
    description: "Move an existing task to another date or time.",
    riskLevel: "medium",
    requiresConfirmation: true,
    executable: false,
  },
  CREATE_TIME_BLOCK: {
    type: "CREATE_TIME_BLOCK",
    label: "Create time block",
    description: "Create a new time block in the plan/calendar.",
    riskLevel: "medium",
    requiresConfirmation: true,
    executable: false,
  },
  UPDATE_DAILY_PLAN: {
    type: "UPDATE_DAILY_PLAN",
    label: "Update daily plan",
    description: "Modify the user's daily plan.",
    riskLevel: "high",
    requiresConfirmation: true,
    executable: false,
  },
  EXPLAIN_PLAN: {
    type: "EXPLAIN_PLAN",
    label: "Explain plan",
    description: "Explain a plan or recommendation.",
    riskLevel: "low",
    requiresConfirmation: false,
    executable: true,
  },
  NO_ACTION: {
    type: "NO_ACTION",
    label: "No action",
    description: "No app action is required.",
    riskLevel: "low",
    requiresConfirmation: false,
    executable: true,
  },
};

export function getActionDefinition(type: BrunoActionType) {
  return brunoActionRegistry[type];
}
```

---

# 9. Phase 4A/B — BrunoActionProposalCard

Create:

```txt
apps/web/components/bruno/BrunoActionProposalCard.tsx
```

Critical syntax: do not repeat Gemini’s broken component syntax.

Bad broken form observed:

```tsx
}: BrunoActionProposalCardProps) => {
```

Correct forms:

```tsx
export function BrunoActionProposalCard(props: BrunoActionProposalCardProps) {
  // ...
}
```

or:

```tsx
export const BrunoActionProposalCard = ({
  proposal,
  onConfirm,
}: BrunoActionProposalCardProps) => {
  // ...
};
```

Recommended props:

```ts
type ExecutionStatus = "idle" | "executing" | "success" | "error" | "cancelled";

type BrunoActionProposalCardProps = {
  proposal: BrunoActionProposal;
  executionStatus?: ExecutionStatus;
  executionError?: string | null;
  onConfirm?: (proposal: BrunoActionProposal) => void | Promise<void>;
  onCancel?: (proposal: BrunoActionProposal) => void;
  compact?: boolean;
};
```

Core behavior:

```tsx
"use client";

import type { BrunoActionProposal } from "@/lib/bruno/tools/types";
import { getActionDefinition } from "@/lib/bruno/tools/registry";

export function BrunoActionProposalCard({
  proposal,
  executionStatus = "idle",
  executionError,
  onConfirm,
  onCancel,
  compact = false,
}: BrunoActionProposalCardProps) {
  const actionDef = getActionDefinition(proposal.type);
  const isExecutable = actionDef.executable;
  const canConfirm = isExecutable && proposal.type === "CREATE_TASK" && executionStatus === "idle";

  return (
    <div className={compact ? "rounded-xl border border-white/10 p-3" : "rounded-2xl border border-white/10 p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{proposal.title}</div>
          <div className="mt-1 text-sm text-white/60">{proposal.description}</div>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase text-emerald-400">
          {proposal.riskLevel} risk
        </span>
      </div>

      {executionStatus === "success" ? (
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Task created
        </div>
      ) : null}

      {executionStatus === "error" ? (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {executionError ?? "Couldn't create task. Try again."}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canConfirm || executionStatus === "executing"}
          onClick={() => onConfirm?.(proposal)}
          className="rounded-lg bg-[#d99043] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {executionStatus === "executing"
            ? "Creating..."
            : executionStatus === "success"
              ? "Executed"
              : isExecutable
                ? "Confirm"
                : "Coming soon"}
        </button>

        <button
          type="button"
          onClick={() => onCancel?.(proposal)}
          className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-white/80"
        >
          {executionStatus === "success" ? "Dismiss" : "Cancel"}
        </button>
      </div>

      {proposal.requiresConfirmation ? (
        <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/50">
          Requires your confirmation to execute.
        </div>
      ) : null}
    </div>
  );
}
```

Avoid raw unescaped quotes in JSX text that trigger lint. If needed, use:

```tsx
&quot;Task created&quot;
```

or use apostrophes.

---

# 10. Phase 4B — `propose_action` Tool In `/api/ai/chat`

Modify:

```txt
apps/web/app/api/ai/chat/route.ts
```

The exact syntax depends on installed AI SDK version. Inspect current imports.

Likely pattern:

```ts
import { streamText, tool } from "ai";
import { z } from "zod";
```

Action proposal schema:

```ts
const proposeActionParams = z.object({
  type: z.enum([
    "CREATE_TASK",
    "UPDATE_TASK",
    "RESCHEDULE_TASK",
    "CREATE_TIME_BLOCK",
    "UPDATE_DAILY_PLAN",
    "EXPLAIN_PLAN",
    "NO_ACTION",
  ]),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  riskLevel: z.enum(["low", "medium", "high"]).default("low"),
  requiresConfirmation: z.boolean().default(true),
  payload: z
    .object({
      taskTitle: z.string().min(1).max(255).optional(),
      notes: z.string().max(1000).optional(),
      estimatedMinutes: z.number().int().min(1).max(1440).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      dueDate: z.string().optional(),
      source: z.literal("bruno").optional(),
    })
    .passthrough()
    .default({}),
});
```

Tool:

```ts
const tools = {
  propose_action: tool({
    description: `
Use this tool whenever Bruno wants to suggest a Planevo app action.

This tool is proposal-only. It does not create, update, delete, move, or reschedule anything.

For assignment/project/task breakdown requests, call this tool once per proposed CREATE_TASK.
Do not only write the tasks in text.
If you mention "confirm" or "create these tasks", corresponding CREATE_TASK proposal cards must exist.

For CREATE_TASK, payload should include:
- taskTitle: string
- notes?: string
- estimatedMinutes?: number
- priority?: "low" | "medium" | "high"
- dueDate?: string only if the user gave a real due date
- source?: "bruno"
`,
    parameters: proposeActionParams,
    execute: async (args) => {
      const validArgs = proposeActionParams.parse(args);

      console.log("[API] propose_action tool called with args:", validArgs);

      return {
        success: true,
        message: "Proposal recorded. Waiting for user confirmation.",
      };
    },
  }),
};
```

If using AI SDK v5, syntax may be `inputSchema` instead of `parameters`. Codex must inspect installed AI SDK version.

## System prompt block

Add this, and remove contradictory legacy direct-mutation instructions.

```txt
BRUNO ACTION SAFETY RULES

1. You cannot directly mutate tasks, calendars, or daily plans.
2. You must propose actions through propose_action.
3. The app will render proposal cards.
4. The user must click Confirm before any mutation happens.
5. Never say "I created", "I moved", "I changed", or "I rescheduled" unless the app reports execution success.
6. Use "I recommend", "I can prepare", "Here is a proposed change", or "Confirm the tasks you want me to add."
7. For assignment/project breakdowns, call propose_action once for each task using type CREATE_TASK.
8. Do not respond with only a long plain-text task list for breakdown requests.
9. If proposal cards exist, keep visible text short.
```

Remove any old rules like:

```txt
Use create_task directly.
Use break_down_task.
Use create_calendar_block aggressively.
When creating/rescheduling/deleting, use the corresponding tool.
```

Those caused Gemini confusion.

---

# 11. Phase 4B/4E — Parsing AI SDK Tool Parts

In `BrunoChatSidebar.tsx`, inspect actual AI SDK message shape.

Add temporary logs:

```ts
console.log("[BrunoChatSidebar] full message:", message);
console.log("[BrunoChatSidebar] message.parts:", message.parts);
```

Parser should support multiple possible shapes because AI SDK versions differ.

Example helper:

```ts
function extractProposalInvocations(message: any) {
  const fromToolInvocations =
    message.toolInvocations?.filter((toolInvocation: any) => {
      return toolInvocation.toolName === "propose_action";
    }) ?? [];

  const fromParts =
    message.parts?.filter((part: any) => {
      return (
        part.type === "tool-propose_action" ||
        part.type === "tool-invocation" && part.toolInvocation?.toolName === "propose_action"
      );
    }) ?? [];

  return { fromToolInvocations, fromParts };
}
```

Convert to proposal:

```ts
function proposalFromToolArgs(args: any): BrunoActionProposal {
  return {
    id:
      args.id ??
      crypto.randomUUID?.() ??
      `proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: args.type,
    title: args.title,
    description: args.description,
    status: "pending_confirmation",
    riskLevel: args.riskLevel ?? "low",
    requiresConfirmation: args.requiresConfirmation ?? true,
    payload: args.payload ?? {},
    createdAt: new Date().toISOString(),
  };
}
```

Important: use stable ids from the tool invocation if available. Do not generate a new id on every render, or idempotency/card state will break. If the part has a `toolCallId`, use that.

Better:

```ts
function proposalFromToolPart(part: any): BrunoActionProposal {
  const args =
    part.input ??
    part.args ??
    part.toolInvocation?.args ??
    part.toolInvocation?.input ??
    {};

  const id =
    args.id ??
    part.toolCallId ??
    part.toolInvocation?.toolCallId ??
    `proposal-${stableHash(JSON.stringify(args))}`;

  return {
    id,
    type: args.type,
    title: args.title,
    description: args.description,
    status: "pending_confirmation",
    riskLevel: args.riskLevel ?? "low",
    requiresConfirmation: args.requiresConfirmation ?? true,
    payload: args.payload ?? {},
    createdAt: args.createdAt ?? new Date().toISOString(),
  };
}
```

If a helper `stableHash` is not present, create a simple deterministic string hash.

Do not generate random ids during render.

---

# 12. Phase 4C — Confirmed CREATE_TASK Execution

Only after proposal cards render.

## Registry change

In `registry.ts`:

```ts
CREATE_TASK: {
  type: "CREATE_TASK",
  label: "Create task",
  description: "Create a new task in Planevo.",
  riskLevel: "low",
  requiresConfirmation: true,
  executable: true,
}
```

All others:

```ts
executable: false
```

## Execution route

Create:

```txt
apps/web/app/api/bruno/actions/execute/route.ts
```

Pseudo-code:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getActionDefinition } from "@/lib/bruno/tools/registry";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser"; // adapt to repo
import { supabaseAdmin } from "@/lib/supabase/admin"; // adapt to repo

const executeActionSchema = z.object({
  proposalId: z.string().min(1),
  type: z.literal("CREATE_TASK"),
  title: z.string().optional(),
  description: z.string().optional(),
  payload: z.object({
    taskTitle: z.string().trim().min(1).max(255),
    notes: z.string().max(1000).optional(),
    dueDate: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    estimatedMinutes: z.number().int().min(1).max(1440).optional(),
    source: z.literal("bruno").optional(),
  }),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = executeActionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid action payload" },
      { status: 400 }
    );
  }

  const actionDef = getActionDefinition(parsed.data.type);

  if (!actionDef?.executable) {
    return NextResponse.json(
      { success: false, error: "Action is not executable" },
      { status: 403 }
    );
  }

  // idempotency check here

  // insert task here using existing Planevo task schema

  return NextResponse.json({
    success: true,
    task: createdTask,
  });
}
```

## Inspect existing task schema

Do not guess.

Find current task creation logic, likely in:

```txt
useTaskActions.ts
components/tasks
lib/tasks
app/api/tasks
```

Map fields exactly.

Previously reported insert fields included:

```ts
completed: false
status: "todo"
ai_confidence_score: 0
is_ai_suggested: true
```

But Codex must inspect the current schema.

---

# 13. Phase 4D — Idempotency + Audit Logging

## Goal

Double-clicking Confirm must not create duplicates.

If available, use existing:

```txt
bruno_tool_logs
```

If that table still exists in the reverted repo, use it.

Before creating task:

```ts
const { data: existingExecution } = await supabaseAdmin
  .from("bruno_tool_logs")
  .select("id, result")
  .eq("user_id", user.id)
  .eq("tool_name", "execute_action")
  .eq("proposal_id", proposalId)
  .maybeSingle();

if (existingExecution) {
  return NextResponse.json({
    success: true,
    message: "Action already executed.",
    duplicate: true,
    existingExecution,
  });
}
```

After success:

```ts
await supabaseAdmin.from("bruno_tool_logs").insert({
  user_id: user.id,
  tool_name: "execute_action",
  proposal_id: proposalId,
  action_type: "CREATE_TASK",
  payload: parsed.data.payload,
  result: {
    created_task_id: createdTask.id,
  },
  status: "executed",
  created_at: new Date().toISOString(),
});
```

Adapt column names to actual schema.

If no log table exists, create minimal backend idempotency or at least frontend lock. But the intended solution is backend idempotency.

## Frontend lock

In `BrunoChatSidebar.tsx`:

```ts
const [executingActions, setExecutingActions] = useState<Record<string, boolean>>({});
const [actionStatuses, setActionStatuses] = useState<Record<string, "idle" | "executing" | "success" | "error">>({});
const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({});
```

Confirm handler:

```ts
async function handleConfirmProposal(proposal: BrunoActionProposal) {
  if (executingActions[proposal.id] || actionStatuses[proposal.id] === "success") {
    return;
  }

  setExecutingActions((prev) => ({ ...prev, [proposal.id]: true }));
  setActionStatuses((prev) => ({ ...prev, [proposal.id]: "executing" }));

  try {
    const response = await fetch("/api/bruno/actions/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposalId: proposal.id,
        type: proposal.type,
        title: proposal.title,
        description: proposal.description,
        payload: proposal.payload,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error ?? "Could not execute action");
    }

    setActionStatuses((prev) => ({ ...prev, [proposal.id]: "success" }));
    setActionErrors((prev) => ({ ...prev, [proposal.id]: null }));
    router.refresh();
  } catch (error) {
    console.error("[Bruno] Failed to execute proposal", error);
    setActionStatuses((prev) => ({ ...prev, [proposal.id]: "error" }));
    setActionErrors((prev) => ({
      ...prev,
      [proposal.id]: "Couldn't create task. Try again.",
    }));
  } finally {
    setExecutingActions((prev) => ({ ...prev, [proposal.id]: false }));
  }
}
```

## Do not append system notification as visible chat

Bad code that must not exist:

```ts
append({
  role: "user",
  content: `SYSTEM NOTIFICATION: The user confirmed and successfully executed the action: ${proposal.type} - "${proposal.title}".`,
});
```

or:

```ts
setMessages((messages) => [
  ...messages,
  {
    role: "user",
    content: `SYSTEM NOTIFICATION: ...`,
  },
]);
```

Correct:

```ts
// Do not add a message.
// Card state is enough.
setActionStatuses((prev) => ({ ...prev, [proposal.id]: "success" }));
router.refresh();
```

If internal execution context is needed later, store it as hidden metadata:

```ts
setExecutedActionsById((prev) => ({
  ...prev,
  [proposal.id]: {
    type: proposal.type,
    title: proposal.title,
    executedAt: new Date().toISOString(),
  },
}));
```

Do not show it.

---

# 14. Phase 4E — Assignment Breakdown Into Multiple CREATE_TASK Cards

## Goal

This is the most important part of the integration.

When user asks:

```txt
Break my AP World DBQ essay into smaller tasks and make it realistic for tonight.
```

The user must see cards, not just text.

## Acceptance criteria

```txt
- Short Bruno response.
- 3–6 CREATE_TASK cards.
- Confirm button on each card.
- Confirming one card creates one task.
- Double-click does not duplicate.
- No SYSTEM NOTIFICATION visible.
- Bruno does not auto-reply after Confirm.
```

## Failure mode we saw

Bruno repeatedly returned plain text:

```txt
Draft introduction and thesis - ...
Outline DBQ essay structure - ...
Write body paragraph 1 - ...
Please confirm each task...
```

No cards.

That is a failure.

## Fix: deterministic fallback

Create:

```txt
apps/web/app/api/bruno/fallback/breakdown/route.ts
```

Purpose:

- If model does not call `propose_action`, fallback creates proposal cards.
- It does not create tasks.
- It only returns proposal objects for UI.

Route sketch:

```ts
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser"; // adapt

const fallbackRequestSchema = z.object({
  userPrompt: z.string().min(1).max(2000),
  assistantText: z.string().max(5000).optional(),
  pageContext: z.unknown().optional(),
});

const taskProposalSchema = z.object({
  taskTitle: z.string().min(1).max(80),
  notes: z.string().max(300).optional(),
  estimatedMinutes: z.number().int().min(1).max(240).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const fallbackResponseSchema = z.object({
  proposals: z.array(taskProposalSchema).min(3).max(6),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = fallbackRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const result = await generateObject({
    model: YOUR_EXISTING_MODEL_HERE,
    schema: fallbackResponseSchema,
    prompt: `
You are converting a student's request into concrete Planevo task proposals.

User request:
${parsed.data.userPrompt}

Assistant draft response:
${parsed.data.assistantText ?? ""}

Return 3-6 realistic tasks.
Keep titles under 80 characters.
Do not invent due dates.
Use estimatedMinutes only when reasonable.
Do not execute anything.
`,
  });

  const now = new Date().toISOString();

  const proposals = result.object.proposals.map((task, index) => ({
    id: `fallback-create-task-${Date.now()}-${index}`,
    type: "CREATE_TASK",
    title: task.taskTitle,
    description: task.notes ?? "Add this task to Planevo.",
    status: "pending_confirmation",
    riskLevel: "low",
    requiresConfirmation: true,
    payload: {
      taskTitle: task.taskTitle,
      notes: task.notes,
      estimatedMinutes: task.estimatedMinutes,
      priority: task.priority,
      source: "bruno",
    },
    createdAt: now,
  }));

  return NextResponse.json({ success: true, proposals });
}
```

Use the existing model/provider from `api/ai/chat/route.ts`. Do not invent a new provider import if the repo already has one.

## Detect breakdown intent

In `BrunoChatSidebar.tsx`:

```ts
function isTaskBreakdownIntent(text: string) {
  return /\b(break down|breakdown|smaller tasks|task list|turn .* into tasks|split .* into tasks|make .* realistic|realistic for tonight)\b/i.test(text);
}
```

## Local fallback state

```ts
const [fallbackProposalsByMessageId, setFallbackProposalsByMessageId] =
  useState<Record<string, BrunoActionProposal[]>>({});
```

When chat finishes:

```ts
async function maybeRunBreakdownFallback({
  lastUserMessage,
  assistantMessage,
}: {
  lastUserMessage: string;
  assistantMessage: any;
}) {
  if (!isTaskBreakdownIntent(lastUserMessage)) return;

  const nativeProposals = extractProposalsFromMessage(assistantMessage);

  if (nativeProposals.length > 0) return;

  const response = await fetch("/api/bruno/fallback/breakdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userPrompt: lastUserMessage,
      assistantText: getVisibleTextFromMessage(assistantMessage),
      pageContext: currentContext,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    console.error("[Bruno] Breakdown fallback failed", result);
    return;
  }

  setFallbackProposalsByMessageId((prev) => ({
    ...prev,
    [assistantMessage.id]: result.proposals,
  }));
}
```

Do not fake AI SDK internal tool parts unless you know exact structure.

## Rendering proposals

```tsx
const nativeProposals = extractProposalsFromMessage(message);
const fallbackProposals = fallbackProposalsByMessageId[message.id] ?? [];
const proposals = nativeProposals.length > 0 ? nativeProposals : fallbackProposals;
const hasProposals = proposals.length > 0;
```

Text cleanup:

```tsx
const displayText = hasProposals
  ? "I broke this into a realistic tonight plan. Confirm the tasks you want me to add."
  : getVisibleTextFromMessage(message);
```

Render:

```tsx
<MessageBubble>{displayText}</MessageBubble>

{hasProposals ? (
  <div className="mt-3 space-y-3">
    {proposals.map((proposal) => (
      <BrunoActionProposalCard
        key={proposal.id}
        proposal={proposal}
        executionStatus={actionStatuses[proposal.id] ?? "idle"}
        executionError={actionErrors[proposal.id]}
        onConfirm={handleConfirmProposal}
        onCancel={handleCancelProposal}
      />
    ))}
  </div>
) : null}
```

## Key issue fixed

The fallback made Phase 4E reliable even when the model refused tool calls.

---

# 15. Phase 4F — Compact Multiple Card UX

This is where the rebuilt integration should go next after Phase 4E passes.

## Goal

Multiple `CREATE_TASK` cards should not overwhelm chat.

Create optional:

```txt
apps/web/components/bruno/BrunoProposalGroup.tsx
```

## Group behavior

When there are multiple `CREATE_TASK` proposals under one assistant message:

```tsx
<BrunoProposalGroup
  proposals={proposals}
  actionStatuses={actionStatuses}
  actionErrors={actionErrors}
  onConfirm={handleConfirmProposal}
  onCancel={handleCancelProposal}
  onConfirmAll={handleConfirmAll}
/>
```

## Compact card mode

In `BrunoActionProposalCard` support:

```tsx
compact
```

Compact layout shows:

```txt
Task title          30m   Low
Short notes...
[Confirm] [Dismiss]
```

Metadata chips:

```tsx
const estimatedMinutes = Number(proposal.payload?.estimatedMinutes);
const priority = proposal.payload?.priority as string | undefined;
const dueDate = proposal.payload?.dueDate as string | undefined;
```

Display only if present. Do not invent.

## Optional Confirm All

If added, it must:

- Use existing `/api/bruno/actions/execute`.
- Execute each proposal individually.
- Preserve per-card success/error.
- Skip already executed cards.
- Skip non-executable cards.
- Not use a new batch endpoint.

Example:

```ts
async function handleConfirmAll(proposals: BrunoActionProposal[]) {
  for (const proposal of proposals) {
    const status = actionStatuses[proposal.id];

    if (status === "success" || status === "executing") continue;
    if (proposal.type !== "CREATE_TASK") continue;

    await handleConfirmProposal(proposal);
  }
}
```

Potential problem: `handleConfirmProposal` reads stale state inside loop. If this happens, refactor to a lower-level `executeProposal(proposal)`.

## Dismiss all

Optional:

```ts
const [dismissedProposalIds, setDismissedProposalIds] = useState<Record<string, boolean>>({});

function dismissProposal(proposal: BrunoActionProposal) {
  setDismissedProposalIds((prev) => ({ ...prev, [proposal.id]: true }));
}
```

Do not delete tasks. This is UI-only.

---

# 16. Future Phases After 4F

Do not implement these until Phase 4F is stable.

## Phase 4G — Update Task Priority / Details

Enable low-to-medium risk updates.

Possible action types:

```txt
UPDATE_TASK
UPDATE_TASK_PRIORITY
```

Need:

- existing task lookup
- clear old/new values
- confirmation card
- backend validation
- idempotency
- audit logs

## Phase 4H — Create Time Block

Can create blocks without moving existing events.

Safer than rescheduling.

Need:

- schedule/time-block schema inspection
- conflict warning
- confirmation

## Phase 4I — Reschedule Task

Medium risk.

Need:

- task id
- old date/time
- new date/time
- explicit confirmation
- undo or audit log

## Phase 4J — Update Daily Plan

High risk.

Need:

- preview diff
- confirm changes
- no silent overwrite
- versioning if possible

## Phase 4K — Google Calendar Writes

Very high trust risk.

Need:

- explicit integration state
- user confirmation
- dry-run preview
- undo/cancel strategy

## Phase 5 — Persistent Bruno Threads + Memory

Need:

- thread table
- message persistence
- hidden execution events
- user preferences
- no leakage of system events into visible messages

---

# 17. Critical Bug List and Exact Fix Patterns

## Bug 1 — Sidebar Ask Bruno navigated to blank route

Bad:

```tsx
<Link href="/dashboard/chat">Ask Bruno</Link>
```

Fix:

```tsx
<button type="button" onClick={() => openBruno(currentContext ?? { source: "sidebar", page: pathname, label: "Current page" })}>
  Ask Bruno
</button>
```

## Bug 2 — Calendar used `React.useMemo` without React import

Bad:

```tsx
const contextLabel = React.useMemo(() => {
  return "Calendar";
}, []);
```

Fix:

```tsx
import { useMemo } from "react";

const contextLabel = useMemo(() => {
  return "Calendar";
}, []);
```

## Bug 3 — Missing auth hook import

Observed:

```txt
Module not found: Can't resolve '@/hooks/useAuth'
```

Fix:

- Inspect actual auth hook path.
- Do not invent `@/hooks/useAuth`.
- If dashboard layout already guards auth, remove unnecessary page-level `useAuth()`.

## Bug 4 — React/react-dom mismatch

Observed:

```txt
react: 19.2.7
react-dom: 19.2.0
```

Fix package versions exactly match.

```bash
npm install react@19.2.7 react-dom@19.2.7
```

Use the correct version for this repo.

## Bug 5 — Broken arrow function component syntax

Bad:

```tsx
}: BrunoActionProposalCardProps) => {
```

Fix:

```tsx
export function BrunoActionProposalCard({
  proposal,
}: BrunoActionProposalCardProps) {
  return <div>{proposal.title}</div>;
}
```

or:

```tsx
export const BrunoActionProposalCard = ({
  proposal,
}: BrunoActionProposalCardProps) => {
  return <div>{proposal.title}</div>;
};
```

## Bug 6 — Unterminated regexp literal from broken JSX

Observed:

```txt
Unterminated regexp literal
```

Cause often:

```tsx
<div>
  ...
</div> // parser thinks malformed closing tag is regex because braces/parentheses are broken
```

Fix:

- Check missing `)}`.
- Check missing `</div>`.
- Check conditional render boundaries.
- Format file.
- Run TypeScript/build.

## Bug 7 — Model returned plain text instead of tool cards

Bad behavior:

```txt
I’ve broken this into tasks:
1. Draft intro...
2. Outline...
Please confirm.
```

Fix:

- Strengthen tool description.
- Parse `message.parts`.
- Add deterministic fallback route.
- Store fallback proposals keyed by assistant message id.
- Render `BrunoActionProposalCard`.

## Bug 8 — Visible SYSTEM NOTIFICATION user bubble

Bad:

```tsx
append({
  role: "user",
  content: `SYSTEM NOTIFICATION: The user confirmed and successfully executed the action...`,
});
```

Fix:

```tsx
// Do not append a chat message.
// Update local card state only.
setActionStatuses((prev) => ({ ...prev, [proposal.id]: "success" }));
router.refresh();
```

## Bug 9 — Bruno auto-replied after Confirm click

Cause:

- Confirm was sending a hidden notification through chat API.

Fix:

- Confirm click calls execution API only.
- No chat append.
- No `submitPrompt`.
- No `append`.
- No assistant response.

## Bug 10 — Random proposal ids on render

Bad:

```ts
id: crypto.randomUUID()
```

inside render/parser called every render.

Fix:

- Use `toolCallId` if available.
- Use stable id from fallback route.
- Use deterministic hash.

---

# 18. Full Acceptance Test Suite

Run after each major phase.

## Global shell

```txt
1. Open /dashboard.
2. Click Ask Bruno.
3. Bruno opens globally.
4. Navigate to /dashboard/tasks.
5. Ask Bruno opens there too.
6. /dashboard/chat redirects safely.
```

## Context

```txt
1. Open Dashboard.
2. Bruno banner says Dashboard.
3. Open Tasks.
4. Bruno banner says Tasks.
5. Open Daily Plan.
6. Bruno banner says Daily Plan.
7. Open Calendar week view.
8. Bruno banner says Calendar • Week of ...
```

## Suggested actions

```txt
1. Dashboard shows dashboard actions.
2. Daily Plan shows recovery actions.
3. Tasks shows task actions.
4. Calendar shows calendar actions.
5. Clicking a suggested action sends a normal user prompt.
```

## CREATE_TASK single card

Prompt:

```txt
Create a task for finishing my English homework.
```

Expected:

```txt
- One CREATE_TASK card.
- Confirm button enabled.
- Confirm creates task.
- Card success.
- Task appears in Tasks/database.
- No system notification visible.
```

## Assignment breakdown

Prompt:

```txt
Break my AP World DBQ essay into smaller tasks and make it realistic for tonight.
```

Expected:

```txt
- Short assistant response.
- 3–6 CREATE_TASK cards.
- No long duplicate text list.
- Confirm one card creates one task.
- Others remain pending.
```

## Double-click idempotency

```txt
1. Double-click Confirm quickly.
2. Only one task created.
3. Backend returns duplicate success or ignores second request.
```

## Non-enabled action

Prompt:

```txt
Move my math homework to tomorrow.
```

Expected:

```txt
- RESCHEDULE_TASK card may appear.
- Confirm disabled / Coming Soon.
- No task/calendar mutation.
```

## System notification regression

```txt
1. Confirm first card.
2. Confirm last card.
3. No orange user bubble saying SYSTEM NOTIFICATION.
4. Bruno does not auto-reply.
```

---

# 19. Build and Debug Commands

Use actual repo commands.

Common:

```bash
cd apps/web
npm run typecheck
npm run lint
npm run build
npm run dev
```

If monorepo root handles scripts:

```bash
npm run typecheck --workspace apps/web
npm run build --workspace apps/web
```

Reset polluted dev cache:

```bash
Ctrl+C
rm -rf .next
npm run dev
Cmd+Shift+R in browser
```

If using root `.next`, adapt.

---

# 20. Logging Requirements During Build

Temporary logs useful during Phase 4E:

Backend:

```ts
console.log("[API] propose_action tool called with args:", validArgs);
```

Frontend:

```ts
console.log("[BrunoChatSidebar] full message:", message);
console.log("[BrunoChatSidebar] message.parts:", message.parts);
console.log("[BrunoChatSidebar] proposalInvocations:", proposalInvocations);
console.log("[BrunoChatSidebar] fallbackProposals:", fallbackProposals);
```

Remove or gate noisy logs before production.

---

# 21. Final Implementation Order For Codex

Do not do everything randomly.

Use this exact order.

```txt
0. Inspect repo, package versions, existing auth/Supabase/task logic.
1. Add BrunoProvider/useBruno/useRegisterBrunoContext.
2. Add BrunoShell global overlay.
3. Modify dashboard layout to mount provider/shell.
4. Modify sidebar Ask Bruno to openBruno.
5. Safe redirect /dashboard/chat.
6. Add page-aware context registration.
7. Add context banner.
8. Send pageContext to chat route.
9. Add BrunoSuggestedActions.
10. Refactor BrunoChatSidebar to shared submitPrompt.
11. Add action proposal types and registry.
12. Add BrunoActionProposalCard.
13. Add propose_action tool in /api/ai/chat.
14. Parse AI SDK message parts/tool invocations.
15. Render proposal cards.
16. Enable CREATE_TASK only.
17. Add /api/bruno/actions/execute.
18. Validate auth and task payload.
19. Insert task using existing schema.
20. Add idempotency using bruno_tool_logs or equivalent.
21. Add frontend per-card state.
22. Ensure Confirm does not append visible chat messages.
23. Add deterministic fallback route for breakdowns.
24. Add fallback state keyed by assistant message id.
25. Clean assistant text when cards exist.
26. Polish compact grouped cards.
27. Optional safe Confirm All.
28. Run full acceptance tests.
```

---

# 22. Non-Negotiable Safety Rules

Codex must preserve these.

```txt
- CREATE_TASK is the only executable mutation until told otherwise.
- RESCHEDULE_TASK remains disabled.
- UPDATE_TASK remains disabled.
- UPDATE_DAILY_PLAN remains disabled.
- CREATE_TIME_BLOCK remains disabled.
- Google Calendar writes remain disabled.
- Model tool call never directly mutates data.
- User confirmation is required.
- Backend validates action type and registry executability.
- Confirm click is not a chat message.
- System/internal messages are never visible user bubbles.
```

---

# 23. What “Done” Looks Like

The rebuild is successful when this works from a clean reverted repo:

```txt
User opens Dashboard.
User clicks Ask Bruno.
Bruno opens globally.
Bruno shows page context.
User asks: “Break my AP World DBQ essay into smaller tasks and make it realistic for tonight.”
Bruno gives short response.
Bruno shows 3–6 compact CREATE_TASK cards.
User clicks Confirm on one card.
Only that task is created.
Card shows success.
No system notification appears.
Bruno does not auto-reply.
The task appears in Tasks.
Double-clicking Confirm does not duplicate.
Non-CREATE_TASK cards remain disabled.
Build/typecheck pass.
```

That is the core integration.
