import { jsonSchema, tool } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';
import type { BrunoDataAccess } from '@/lib/bruno/types';
import { sanitizeSearchQuery } from '@/lib/bruno/readTools';
import { buildDayPlanSnapshot } from '@/lib/plan/day-plan';
import { NOTE_KIND_VALUES, TASK_STATUS_VALUES } from '@/lib/bruno/tools/schemas';

type Supabase = SupabaseClient<Database>;
type TaskStatus = (typeof TASK_STATUS_VALUES)[number];
type NoteKind = (typeof NOTE_KIND_VALUES)[number];

function clampLimit(value: number | undefined, defaultLimit: number, max: number): number {
  return Math.min(Math.max(1, value ?? defaultLimit), max);
}

function dayBounds(dateStr: string): { start: string; end: string } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getBrunoV3ReadTools(userId: string, dataAccess: BrunoDataAccess) {
  const supabase = supabaseAdmin as Supabase;

  return {
    get_calendar_events: tool({
      description:
        "Fetch the user's calendar events by date range. Call before proposing reschedule or time blocks.",
      inputSchema: jsonSchema<{
        start_date: string;
        end_date: string;
        title_search?: string;
      }>({
        type: 'object',
        properties: {
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          title_search: { type: 'string', maxLength: 200 },
        },
        required: ['start_date', 'end_date'],
      }),
      execute: async ({ start_date, end_date, title_search }) => {
        if (!dataAccess.calendar) {
          return { success: false, error: 'ACCESS_DISABLED', message: 'Calendar access is disabled.' };
        }
        const { start } = dayBounds(start_date);
        const { end } = dayBounds(end_date);
        let query = supabase
          .from('calendar_events')
          .select('id, title, start_time, end_time, description, color, status')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .gte('start_time', start)
          .lte('start_time', end)
          .order('start_time', { ascending: true })
          .limit(50);
        if (title_search) {
          const sanitized = sanitizeSearchQuery(title_search);
          if (sanitized) query = query.ilike('title', `%${sanitized}%`);
        }
        const { data, error } = await query;
        if (error) return { success: false, error: 'Failed to fetch calendar events.' };
        return { success: true, events: data ?? [] };
      },
    }),

    get_tasks: tool({
      description: "Fetch the user's tasks with optional filters.",
      inputSchema: jsonSchema<{
        status?: TaskStatus;
        due_before?: string;
        due_after?: string;
        limit?: number;
      }>({
        type: 'object',
        properties: {
          status: { type: 'string', enum: [...TASK_STATUS_VALUES] },
          due_before: { type: 'string' },
          due_after: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 50 },
        },
      }),
      execute: async ({ status, due_before, due_after, limit }) => {
        if (!dataAccess.tasks) {
          return { success: false, error: 'ACCESS_DISABLED', message: 'Task access is disabled.' };
        }
        let query = supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, estimated_minutes, notes')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(clampLimit(limit, 20, 50));
        if (status) query = query.eq('status', status);
        if (due_before) query = query.lte('due_date', due_before);
        if (due_after) query = query.gte('due_date', due_after);
        const { data, error } = await query;
        if (error) return { success: false, error: 'Failed to fetch tasks.' };
        return { success: true, tasks: data ?? [] };
      },
    }),

    get_daily_plan: tool({
      description: "Fetch the user's scheduled plan blocks for a specific date.",
      inputSchema: jsonSchema<{ date: string }>({
        type: 'object',
        properties: {
          date: { type: 'string' },
        },
        required: ['date'],
      }),
      execute: async ({ date }) => {
        if (!dataAccess.calendar) {
          return { success: false, error: 'ACCESS_DISABLED', message: 'Calendar access is disabled.' };
        }
        const { start, end } = dayBounds(date);
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .neq('status', 'rejected')
          .gte('start_time', start)
          .lte('start_time', end)
          .order('start_time', { ascending: true });
        if (error) return { success: false, error: 'Failed to fetch daily plan.' };
        const snapshot = buildDayPlanSnapshot(data ?? []);
        return {
          success: true,
          date,
          blocks: snapshot.blocks.map((b) => ({
            id: b.id,
            title: b.title,
            startTime: b.startTime.toISOString(),
            endTime: b.endTime.toISOString(),
            status: b.status,
            isAiSuggested: b.isAiSuggested,
            type: b.type,
          })),
          pendingCount: snapshot.pendingCount,
          acceptedCount: snapshot.acceptedCount,
        };
      },
    }),

    search_notes: tool({
      description: "Search the user's notes by keyword, kind, or subject.",
      inputSchema: jsonSchema<{
        query?: string;
        note_kind?: NoteKind;
        notebook_id?: string;
        subject?: string;
        limit?: number;
      }>({
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 200 },
          note_kind: { type: 'string', enum: [...NOTE_KIND_VALUES] },
          notebook_id: { type: 'string' },
          subject: { type: 'string', maxLength: 200 },
          limit: { type: 'number', minimum: 1, maximum: 20 },
        },
      }),
      execute: async ({ query, note_kind, notebook_id, subject, limit }) => {
        const safeLimit = clampLimit(limit, 10, 20);
        const buildBaseQuery = () => {
          let q = supabase
            .from('notes')
            .select('id, title, subject, note_kind, is_pinned, updated_at, content_markdown')
            .eq('user_id', userId)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false })
            .limit(safeLimit);
          if (note_kind) q = q.eq('note_kind', note_kind);
          if (notebook_id) q = q.eq('notebook_id', notebook_id);
          if (subject) {
            const sanitizedSubject = sanitizeSearchQuery(subject);
            if (sanitizedSubject) q = q.ilike('subject', `%${sanitizedSubject}%`);
          }
          return q;
        };
        const mapNotes = (rows: Array<{ id: string; title: string; subject: string | null; note_kind: string; is_pinned: boolean; updated_at: string; content_markdown: string | null }>) =>
          rows.map((n) => ({
            id: n.id,
            title: n.title,
            subject: n.subject,
            note_kind: n.note_kind,
            is_pinned: n.is_pinned,
            updated_at: n.updated_at,
            preview: n.content_markdown?.slice(0, 300) ?? '',
          }));

        if (query) {
          const sanitized = sanitizeSearchQuery(query);
          if (sanitized) {
            const { data: ftsData, error: ftsError } = await buildBaseQuery().textSearch('search_vector', sanitized);
            if (!ftsError && ftsData?.length) return { success: true, notes: mapNotes(ftsData) };
            const { data: ilikeData, error: ilikeError } = await buildBaseQuery().ilike('title', `%${sanitized}%`);
            if (ilikeError) return { success: false, error: 'Failed to search notes.' };
            return { success: true, notes: mapNotes(ilikeData ?? []) };
          }
        }
        const { data, error } = await buildBaseQuery();
        if (error) return { success: false, error: 'Failed to search notes.' };
        return { success: true, notes: mapNotes(data ?? []) };
      },
    }),

    read_note: tool({
      description: 'Read a note by ID. Returns markdown only.',
      inputSchema: jsonSchema<{ note_id: string }>({
        type: 'object',
        properties: {
          note_id: { type: 'string' },
        },
        required: ['note_id'],
      }),
      execute: async ({ note_id }) => {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, subject, note_kind, content_markdown, is_pinned, updated_at')
          .eq('id', note_id)
          .eq('user_id', userId)
          .maybeSingle();
        if (error || !data) return { success: false, error: 'Note not found or access denied.' };
        return {
          success: true,
          id: data.id,
          title: data.title,
          subject: data.subject,
          note_kind: data.note_kind,
          is_pinned: data.is_pinned,
          updated_at: data.updated_at,
          content: data.content_markdown ?? '',
        };
      },
    }),

    get_user_context: tool({
      description: "Load week summary: events, tasks, recent notes.",
      inputSchema: jsonSchema<Record<string, never>>({
        type: 'object',
        properties: {},
      }),
      execute: async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const [eventsResult, tasksResult, pinnedResult, recentResult] = await Promise.all([
          dataAccess.calendar
            ? supabase.from('calendar_events').select('id, title, start_time, end_time').eq('user_id', userId).eq('is_deleted', false).gte('start_time', today.toISOString()).lte('start_time', weekEnd.toISOString()).order('start_time').limit(20)
            : Promise.resolve({ data: [] }),
          dataAccess.tasks
            ? supabase.from('tasks').select('id, title, status, due_date, priority').eq('user_id', userId).is('deleted_at', null).in('status', ['todo', 'in_progress']).order('due_date').limit(20)
            : Promise.resolve({ data: [] }),
          supabase.from('notes').select('id, title, note_kind, subject, is_pinned, updated_at').eq('user_id', userId).eq('is_archived', false).eq('is_pinned', true).order('updated_at', { ascending: false }).limit(5),
          supabase.from('notes').select('id, title, note_kind, subject, is_pinned, updated_at').eq('user_id', userId).eq('is_archived', false).order('updated_at', { ascending: false }).limit(5),
        ]);
        return {
          success: true,
          today: today.toISOString().split('T')[0],
          events: eventsResult.data ?? [],
          tasks: tasksResult.data ?? [],
          pinnedNotes: pinnedResult.data ?? [],
          recentNotes: recentResult.data ?? [],
        };
      },
    }),
  };
}
