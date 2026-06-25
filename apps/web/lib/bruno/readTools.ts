import { tool, jsonSchema } from 'ai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BrunoDataAccess } from './types';

const WORK_PROVIDERS = ['notion', 'slack', 'linear'] as const;
type WorkProvider = (typeof WORK_PROVIDERS)[number];

/**
 * Sanitize user input for use in Supabase .or() ilike filters.
 * Strips characters that could break the PostgREST filter syntax.
 */
export function sanitizeSearchQuery(query: string): string {
  return query.replace(/[%,()]/g, '').trim();
}

function clampLimit(value: number | undefined, defaultLimit: number, max: number): number {
  return Math.min(Math.max(1, value ?? defaultLimit), max);
}

export function getBrunoReadTools(userId: string, dataAccess: BrunoDataAccess) {
  return {
    search_tasks: tool({
      description:
        'Search user tasks in Planevo by query, status, priority, or due date. Use this to search, find, or retrieve tasks.',
      inputSchema: jsonSchema<{
        query?: string;
        status?: 'todo' | 'in_progress' | 'done' | 'missed';
        priority?: 'low' | 'medium' | 'high';
        dueBefore?: string;
        dueAfter?: string;
        limit?: number;
      }>({
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 200 },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'missed'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          dueBefore: { type: 'string' },
          dueAfter: { type: 'string' },
          limit: { type: 'number' },
        },
      }),
      execute: async ({
        query,
        status,
        priority,
        dueBefore,
        dueAfter,
        limit,
      }: {
        query?: string;
        status?: 'todo' | 'in_progress' | 'done' | 'missed';
        priority?: 'low' | 'medium' | 'high';
        dueBefore?: string;
        dueAfter?: string;
        limit?: number;
      }) => {
        if (!dataAccess.tasks) {
          return {
            success: false,
            error: 'ACCESS_DISABLED',
            message:
              'Task access is disabled in settings. The user must enable Task Access in Settings > Bruno Preferences to allow you to search or view tasks.',
          };
        }

        const safeLimit = clampLimit(limit, 50, 100);

        let dbQuery = supabaseAdmin
          .from('tasks')
          .select(
            'id, title, description, notes, status, due_date, priority, estimated_minutes'
          )
          .eq('user_id', userId)
          .is('deleted_at', null);

        if (query) {
          const sanitized = sanitizeSearchQuery(query);
          if (sanitized) {
            dbQuery = dbQuery.or(
              `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
            );
          }
        }
        if (status) {
          dbQuery = dbQuery.eq('status', status);
        }
        if (priority) {
          dbQuery = dbQuery.eq('priority', priority);
        }
        if (dueBefore) {
          dbQuery = dbQuery.lte('due_date', dueBefore);
        }
        if (dueAfter) {
          dbQuery = dbQuery.gte('due_date', dueAfter);
        }

        const { data, error } = await dbQuery
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(safeLimit);

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          tasks: (data || []).map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            notes: t.notes,
            status: t.status,
            dueDate: t.due_date,
            priority: t.priority,
            estimatedMinutes: t.estimated_minutes,
          })),
        };
      },
    }),

    search_calendar_events: tool({
      description:
        'Search user calendar events in Planevo (including manual and synced Google Calendar events) by query or date range.',
      inputSchema: jsonSchema<{
        query?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
      }>({
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 200 },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          limit: { type: 'number' },
        },
      }),
      execute: async ({
        query,
        startTime,
        endTime,
        limit,
      }: {
        query?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
      }) => {
        if (!dataAccess.calendar) {
          return {
            success: false,
            error: 'ACCESS_DISABLED',
            message:
              'Calendar access is disabled in settings. The user must enable Calendar Access in Settings > Bruno Preferences to allow you to search or view calendar events.',
          };
        }

        const safeLimit = clampLimit(limit, 50, 100);

        let dbQuery = supabaseAdmin
          .from('calendar_events')
          .select(
            'id, title, description, start_time, end_time, status, source'
          )
          .eq('user_id', userId)
          .is('deleted_at', null);

        if (query) {
          const sanitized = sanitizeSearchQuery(query);
          if (sanitized) {
            dbQuery = dbQuery.or(
              `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
            );
          }
        }
        if (startTime) {
          dbQuery = dbQuery.gte('start_time', startTime);
        }
        if (endTime) {
          dbQuery = dbQuery.lte('start_time', endTime);
        }

        const { data, error } = await dbQuery
          .order('start_time', { ascending: true })
          .limit(safeLimit);

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          events: (data || []).map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            startTime: e.start_time,
            endTime: e.end_time,
            status: e.status,
            source: e.source,
          })),
        };
      },
    }),

    search_canvas_assignments: tool({
      description:
        'Search Canvas courses and assignments for user study plan integration.',
      inputSchema: jsonSchema<{
        query?: string;
        courseName?: string;
        limit?: number;
      }>({
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 200 },
          courseName: { type: 'string', maxLength: 200 },
          limit: { type: 'number' },
        },
      }),
      execute: async ({
        query,
        courseName,
        limit,
      }: {
        query?: string;
        courseName?: string;
        limit?: number;
      }) => {
        if (!dataAccess.canvas) {
          return {
            success: false,
            error: 'ACCESS_DISABLED',
            message:
              'Canvas access is disabled in settings. The user must enable Canvas Access in Settings > Bruno Preferences to allow you to search or view Canvas assignments.',
          };
        }

        const safeLimit = clampLimit(limit, 30, 50);

        let dbQuery = supabaseAdmin
          .from('canvas_assignments')
          .select('id, name, course_name, due_at, description, html_url')
          .eq('user_id', userId);

        if (query) {
          const sanitized = sanitizeSearchQuery(query);
          if (sanitized) {
            dbQuery = dbQuery.or(
              `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
            );
          }
        }
        if (courseName) {
          const sanitized = sanitizeSearchQuery(courseName);
          if (sanitized) {
            dbQuery = dbQuery.ilike('course_name', `%${sanitized}%`);
          }
        }

        const { data, error } = await dbQuery
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(safeLimit);

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          assignments: (data || []).map((a) => ({
            id: a.id,
            name: a.name,
            courseName: a.course_name,
            dueAt: a.due_at,
            description: a.description,
            htmlUrl: a.html_url,
          })),
        };
      },
    }),

    search_work_items: tool({
      description:
        'Search Notion, Slack, and Linear work items synced into Planevo by keyword or provider.',
      inputSchema: jsonSchema<{
        query?: string;
        provider?: WorkProvider;
        limit?: number;
      }>({
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 200 },
          provider: { type: 'string', enum: [...WORK_PROVIDERS] },
          limit: { type: 'number' },
        },
      }),
      execute: async ({
        query,
        provider,
        limit,
      }: {
        query?: string;
        provider?: WorkProvider;
        limit?: number;
      }) => {
        if (!dataAccess.integrations) {
          return {
            success: false,
            error: 'ACCESS_DISABLED',
            message:
              'Work integrations access is disabled in settings. The user must enable Work Integrations Access in Settings > Bruno Preferences to allow you to search work items.',
          };
        }

        const safeLimit = clampLimit(limit, 30, 50);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let dbQuery = (supabaseAdmin as any)
          .from('source_items')
          .select('id, provider, title, status, due_date, url')
          .eq('user_id', userId)
          .in('provider', provider ? [provider] : WORK_PROVIDERS)
          .is('deleted_at', null)
          .is('imported_task_id', null);

        if (query) {
          const sanitized = sanitizeSearchQuery(query);
          if (sanitized) {
            dbQuery = dbQuery.ilike('title', `%${sanitized}%`);
          }
        }

        const { data, error } = await dbQuery
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(safeLimit);

        if (error) {
          return { success: false, error: error.message };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {
          success: true,
          items: ((data || []) as any[]).map((item) => ({
            id: item.id,
            provider: item.provider,
            title: item.title,
            status: item.status,
            dueDate: item.due_date,
            url: item.url,
          })),
        };
      },
    }),

    get_integrations_status: tool({
      description:
        'Retrieve status of external integrations (Notion, Slack, Linear) connected to Planevo.',
      inputSchema: jsonSchema<Record<string, never>>({
        type: 'object',
        properties: {},
      }),
      execute: async () => {
        if (!dataAccess.integrations) {
          return {
            success: false,
            error: 'ACCESS_DISABLED',
            message:
              'Work integrations access is disabled in settings. The user must enable Work Integrations Access in Settings > Bruno Preferences to allow you to view integrations.',
          };
        }

        const { data: accounts, error: accError } = await supabaseAdmin
          .from('integration_accounts')
          .select('provider, status')
          .eq('user_id', userId)
          .in('provider', [...WORK_PROVIDERS]);

        if (accError) {
          return { success: false, error: accError.message };
        }

        const connectedSet = new Set(
          (accounts ?? [])
            .filter((a) => a.status === 'connected')
            .map((a) => a.provider)
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sourceItems } = await (supabaseAdmin as any)
          .from('source_items')
          .select('provider, title, status, due_date, url')
          .eq('user_id', userId)
          .in('provider', [...WORK_PROVIDERS])
          .is('deleted_at', null)
          .is('imported_task_id', null);

        const DONE_STATUSES = new Set([
          'done',
          'completed',
          'complete',
          'closed',
          'cancelled',
          'canceled',
          'archived',
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const openItems = ((sourceItems || []) as any[]).filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) =>
            !DONE_STATUSES.has(String(item.status ?? '').toLowerCase())
        );

        const statusReport = WORK_PROVIDERS.map((workProvider) => {
          const providerItems = openItems.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (i: any) => i.provider === workProvider
          );
          return {
            provider: workProvider,
            connected: connectedSet.has(workProvider),
            openCount: providerItems.length,
          };
        });

        return {
          success: true,
          integrations: statusReport,
        };
      },
    }),
  };
}
