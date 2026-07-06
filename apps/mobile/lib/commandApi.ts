/**
 * Planevo mobile — Command API client.
 *
 * Wraps the web Command endpoints (they accept Bearer auth via getAuthenticatedUser).
 * Callers pass the Supabase access token from `useAuth().session.access_token`.
 * Mirrors the request/response contracts in apps/web/lib/command/types.ts.
 */

import { getApiUrl } from './api';

export type ResponsibilityType =
  | 'assignment'
  | 'assessment'
  | 'meeting'
  | 'class'
  | 'follow_up'
  | 'errand'
  | 'admin'
  | 'unknown'
  | string;

export type ResponsibilityPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface MobileResponsibilityItem {
  id: string;
  title: string;
  type: ResponsibilityType;
  status: string;
  priority: ResponsibilityPriority;
  dueAt: string | null;
  sourceType: string;
}

export interface MobileBoard {
  now: MobileResponsibilityItem[];
  today: MobileResponsibilityItem[];
  dueSoon: MobileResponsibilityItem[];
  onMyPlate: MobileResponsibilityItem[];
  unsorted: MobileResponsibilityItem[];
  waiting: MobileResponsibilityItem[];
  done: MobileResponsibilityItem[];
}

export interface MobilePreviewItem {
  title: string;
  description: string | null;
  type: ResponsibilityType;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  priority: ResponsibilityPriority;
  needsReview: boolean;
  reviewReason: string | null;
  whyItMatters: string | null;
}

export interface IntakeResult {
  intakeRunId: string;
  summary: string;
  previewItems: MobilePreviewItem[];
}

export class CommandLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandLimitError';
  }
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function createCommandApi(token: string) {
  const base = getApiUrl();

  return {
    async loadBoard(): Promise<MobileBoard> {
      const res = await fetch(
        `${base}/api/command/board?timezone=${encodeURIComponent(timezone())}`,
        { headers: authHeaders(token) },
      );
      if (!res.ok) throw new Error(`Board load failed (${res.status})`);
      const data = (await res.json()) as { board: MobileBoard };
      return data.board;
    },

    async intake(text: string): Promise<IntakeResult> {
      const res = await fetch(`${base}/api/command/intake`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          inputMode: 'text',
          text,
          timezone: timezone(),
          clientNow: new Date().toISOString(),
        }),
      });
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new CommandLimitError(
          body.message ?? 'You have used today’s free cleanups. You can still add tasks manually.',
        );
      }
      if (!res.ok) throw new Error(`Intake failed (${res.status})`);
      return (await res.json()) as IntakeResult;
    },

    async confirm(
      intakeRunId: string,
      items: (MobilePreviewItem & { accepted: boolean })[],
    ): Promise<MobileBoard> {
      const res = await fetch(`${base}/api/command/confirm`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          intakeRunId,
          timezone: timezone(),
          items: items.map((i) => ({
            title: i.title,
            description: i.description,
            type: i.type,
            dueAt: i.dueAt,
            startAt: i.startAt,
            endAt: i.endAt,
            priority: i.priority,
            whyItMatters: i.whyItMatters,
            accepted: i.accepted,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Confirm failed (${res.status})`);
      const data = (await res.json()) as { board: MobileBoard };
      return data.board;
    },

    async setStatus(itemId: string, status: string): Promise<void> {
      const res = await fetch(`${base}/api/command/items/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
    },
  };
}

export type CommandApi = ReturnType<typeof createCommandApi>;
