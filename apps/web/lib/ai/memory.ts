import { z } from 'zod';
import type { Database, Json } from '@/types/database';

type SupabaseServerClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;
type UserAiMemoryRow = Database['public']['Tables']['user_ai_memory']['Row'];

const memoryWindowSchema = z.object({
  label: z.string().min(1).max(80),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  source: z.string().max(80).default('manual'),
});

const breakPreferenceSchema = z.object({
  frequency: z.enum(['minimal', 'balanced', 'frequent']).default('balanced'),
  preferred_minutes: z.number().int().min(5).max(45).default(15),
  notes: z.array(z.string()).default([]),
});

const planningStyleSchema = z.object({
  mode: z.enum(['strict', 'balanced', 'flexible']).default('balanced'),
  proactivity: z.enum(['silent', 'light', 'active', 'high']).default('active'),
  max_focus_blocks_per_day: z.number().int().min(1).max(12).default(5),
  max_planned_minutes_per_day: z.number().int().min(30).max(720).default(240),
  allow_buffers: z.boolean().default(true),
  rollover_style: z.enum(['automatic', 'review', 'manual']).default('automatic'),
  weekly_review_day: z.string().default('Sunday'),
  weekly_review_time: z.string().regex(/^\d{2}:\d{2}$/).default('17:00'),
  work_hours: memoryWindowSchema.optional(),
});

const tonePreferenceSchema = z.object({
  style: z.enum(['direct', 'warm', 'coach']).default('warm'),
  response_length: z.enum(['brief', 'standard', 'detailed']).default('standard'),
  emoji_level: z.enum(['none', 'low', 'medium']).default('low'),
  avoid_phrases: z.array(z.string()).default([]),
});

const taskDetailPreferenceSchema = z.object({
  detail_level: z.enum(['brief', 'standard', 'high']).default('high'),
  require_success_condition: z.boolean().default(true),
  require_materials: z.boolean().default(true),
  require_why_now: z.boolean().default(true),
});

const memoryRuleSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(240),
  feature: z.string().max(80).default('global'),
  confidence: z.number().min(0).max(1).default(0.5),
  evidence_count: z.number().int().min(1).default(1),
  last_seen_at: z.string().optional(),
});

const memoryPatternSchema = z.object({
  label: z.string().min(1).max(100),
  detail: z.string().max(240).optional(),
  feature: z.string().max(80).default('global'),
  count: z.number().int().min(1).default(1),
  last_seen_at: z.string().optional(),
});

const memoryLearningSettingsSchema = z.object({
  learning_enabled: z.boolean().default(true),
});

const sourceCountersSchema = z.record(z.string(), z.number().int().min(0)).default({});

// ---------------------------------------------------------------------------
// NEW: Task-specific preference schemas for enhanced memory
// ---------------------------------------------------------------------------

/** Learns how long a user prefers to spend on specific task categories (e.g., "Math" → 60m) */
const taskDurationPrefSchema = z.object({
  category: z.string().min(1).max(80),
  preferred_minutes: z.number().int().min(5).max(480),
  evidence_count: z.number().int().min(1).default(1),
  last_seen_at: z.string().optional(),
});

/** Learns what time of day a user prefers for specific task categories (e.g., "Workout" → "morning") */
const taskTimePrefSchema = z.object({
  category: z.string().min(1).max(80),
  preferred_time: z.enum(['early_morning', 'morning', 'afternoon', 'evening', 'night']),
  evidence_count: z.number().int().min(1).default(1),
  last_seen_at: z.string().optional(),
});

/** Learns which tasks the user tends to group together (habit stacking) */
const taskGroupingPrefSchema = z.object({
  task_a: z.string().min(1).max(80),
  task_b: z.string().min(1).max(80),
  evidence_count: z.number().int().min(1).default(1),
  last_seen_at: z.string().optional(),
});

export const userAiMemorySchema = z.object({
  preferred_focus_windows: z.array(memoryWindowSchema).default([]),
  avoided_focus_windows: z.array(memoryWindowSchema).default([]),
  break_preference: breakPreferenceSchema.default({
    frequency: 'balanced',
    preferred_minutes: 15,
    notes: []
  }),
  planning_style: planningStyleSchema.default({
    mode: 'balanced',
    proactivity: 'active',
    max_focus_blocks_per_day: 5,
    max_planned_minutes_per_day: 240,
    allow_buffers: true,
    rollover_style: 'automatic',
    weekly_review_day: 'Sunday',
    weekly_review_time: '17:00'
  }),
  tone_preference: tonePreferenceSchema.default({
    style: 'warm',
    response_length: 'standard',
    emoji_level: 'low',
    avoid_phrases: []
  }),
  task_detail_preference: taskDetailPreferenceSchema.default({
    detail_level: 'high',
    require_success_condition: true,
    require_materials: true,
    require_why_now: true
  }),
  recurring_constraints: z.array(memoryWindowSchema).default([]),
  learned_rules: z.array(memoryRuleSchema).default([]),
  disliked_patterns: z.array(memoryPatternSchema).default([]),
  accepted_patterns: z.array(memoryPatternSchema).default([]),
  memory_learning_settings: memoryLearningSettingsSchema.default({
    learning_enabled: true,
  }),
  source_counters: sourceCountersSchema,
  // --- Enhanced memory fields ---
  task_duration_preferences: z.array(taskDurationPrefSchema).default([]),
  task_time_preferences: z.array(taskTimePrefSchema).default([]),
  task_grouping_preferences: z.array(taskGroupingPrefSchema).default([]),
});

export type UserAiMemory = z.infer<typeof userAiMemorySchema>;
export type UserAiMemoryPatch = Partial<UserAiMemory>;

export const DEFAULT_USER_AI_MEMORY: UserAiMemory = userAiMemorySchema.parse({});

export function parseUserAiMemory(row: UserAiMemoryRow | null | undefined): UserAiMemory {
  if (!row) return DEFAULT_USER_AI_MEMORY;

  const raw = row as UserAiMemoryRow & Record<string, unknown>;
  return userAiMemorySchema.parse({
    preferred_focus_windows: row.preferred_focus_windows,
    avoided_focus_windows: row.avoided_focus_windows,
    break_preference: row.break_preference,
    planning_style: row.planning_style,
    tone_preference: row.tone_preference,
    task_detail_preference: row.task_detail_preference,
    recurring_constraints: row.recurring_constraints,
    learned_rules: row.learned_rules,
    disliked_patterns: row.disliked_patterns,
    accepted_patterns: row.accepted_patterns,
    memory_learning_settings: raw.memory_learning_settings,
    source_counters: row.source_counters,
    // Enhanced memory fields (gracefully default if column doesn't exist yet)
    task_duration_preferences: raw.task_duration_preferences ?? [],
    task_time_preferences: raw.task_time_preferences ?? [],
    task_grouping_preferences: raw.task_grouping_preferences ?? [],
  });
}

export async function getUserAIMemory(
  supabase: SupabaseServerClient,
  userId: string
): Promise<UserAiMemory> {
  const { data, error } = await supabase
    .from('user_ai_memory')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[user-ai-memory] read error:', error);
    return DEFAULT_USER_AI_MEMORY;
  }

  if (data) {
    const memory = parseUserAiMemory(data);
    // Lazy compaction: clean up memory if it's getting cluttered
    if (shouldCompact(memory, data.last_compacted_at)) {
      return compactMemory(supabase, userId, memory);
    }
    return memory;
  }

  const { data: created, error: createError } = await supabase
    .from('user_ai_memory')
    .insert({
      user_id: userId,
      ...memoryToDb(DEFAULT_USER_AI_MEMORY),
    })
    .select('*')
    .single();

  if (createError) {
    console.error('[user-ai-memory] create error:', createError);
    return DEFAULT_USER_AI_MEMORY;
  }

  return parseUserAiMemory(created);
}

export async function updateUserAIMemory(
  supabase: SupabaseServerClient,
  userId: string,
  patch: UserAiMemoryPatch
): Promise<UserAiMemory> {
  const current = await getUserAIMemory(supabase, userId);
  const merged = userAiMemorySchema.parse({
    ...current,
    ...patch,
  });

  const { data, error } = await supabase
    .from('user_ai_memory')
    .update({
      ...memoryToDb(merged),
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('[user-ai-memory] update error:', error);
    throw new Error(`Database update failed: ${error.message}`);
  }

  return parseUserAiMemory(data);
}

export async function recordScheduleBlockFeedbackInMemory(
  supabase: SupabaseServerClient,
  userId: string,
  action: string,
  block: Record<string, unknown>
): Promise<UserAiMemory> {
  const current = await getUserAIMemory(supabase, userId);
  if (!current.memory_learning_settings.learning_enabled) {
    return current;
  }

  const now = new Date().toISOString();
  const blockType = typeof block.type === 'string' ? block.type : 'block';
  const duration = typeof block.duration === 'number' ? block.duration : null;

  if (action === 'accept') {
    return updateUserAIMemory(supabase, userId, {
      accepted_patterns: upsertPattern(current.accepted_patterns, {
        label: `${blockType} block accepted`,
        detail: duration ? `Accepted a ${duration} minute ${blockType} block.` : undefined,
        feature: 'daily_plan',
        count: 1,
        last_seen_at: now,
      }),
      source_counters: incrementCounter(current.source_counters, 'daily_plan_accept'),
    });
  }

  if (action === 'too_vague') {
    return updateUserAIMemory(supabase, userId, {
      task_detail_preference: {
        ...current.task_detail_preference,
        detail_level: 'high',
        require_success_condition: true,
        require_materials: true,
        require_why_now: true,
      },
      disliked_patterns: upsertPattern(current.disliked_patterns, {
        label: 'vague schedule block',
        detail: 'User wants exact actions, success conditions, and concrete instructions.',
        feature: 'daily_plan',
        count: 1,
        last_seen_at: now,
      }),
      learned_rules: upsertRule(current.learned_rules, {
        id: 'daily-plan-require-concrete-blocks',
        text: 'Daily plan blocks must specify the exact action, done-when condition, and why the slot was chosen.',
        feature: 'daily_plan',
        confidence: 0.8,
        evidence_count: 1,
        last_seen_at: now,
      }),
      source_counters: incrementCounter(current.source_counters, 'daily_plan_too_vague'),
    });
  }

  if (action === 'too_many_breaks') {
    return updateUserAIMemory(supabase, userId, {
      break_preference: {
        ...current.break_preference,
        frequency: 'minimal',
      },
      disliked_patterns: upsertPattern(current.disliked_patterns, {
        label: 'unnecessary breaks',
        detail: 'User dislikes breaks that are not justified by sustained focus or energy recovery.',
        feature: 'daily_plan',
        count: 1,
        last_seen_at: now,
      }),
      learned_rules: upsertRule(current.learned_rules, {
        id: 'daily-plan-minimize-breaks',
        text: 'Only schedule breaks when there is a clear recovery reason after sustained focus.',
        feature: 'daily_plan',
        confidence: 0.75,
        evidence_count: 1,
        last_seen_at: now,
      }),
      source_counters: incrementCounter(current.source_counters, 'daily_plan_too_many_breaks'),
    });
  }

  if (action === 'wrong_time') {
    return updateUserAIMemory(supabase, userId, {
      disliked_patterns: upsertPattern(current.disliked_patterns, {
        label: 'poor time placement',
        detail: 'User rejected the selected time for a schedule block.',
        feature: 'daily_plan',
        count: 1,
        last_seen_at: now,
      }),
      learned_rules: upsertRule(current.learned_rules, {
        id: 'daily-plan-explain-time-placement',
        text: 'When choosing a time slot, explain why that time fits the task and user constraints.',
        feature: 'daily_plan',
        confidence: 0.65,
        evidence_count: 1,
        last_seen_at: now,
      }),
      source_counters: incrementCounter(current.source_counters, 'daily_plan_wrong_time'),
    });
  }

  return current;
}

export function buildMemoryContext(memory: UserAiMemory): string {
  const lines: string[] = [];

  lines.push(`Planning style: ${memory.planning_style.mode}`);
  lines.push(`Proactivity: ${memory.planning_style.proactivity}`);
  lines.push(`Detail level: ${memory.task_detail_preference.detail_level}`);
  lines.push(`Break preference: ${memory.break_preference.frequency}, ${memory.break_preference.preferred_minutes} minutes`);
  lines.push(`Tone: ${memory.tone_preference.style}, response length: ${memory.tone_preference.response_length}, emoji level: ${memory.tone_preference.emoji_level}`);

  if (memory.preferred_focus_windows.length > 0) {
    lines.push(`Preferred focus windows: ${memory.preferred_focus_windows.map(formatWindow).join('; ')}`);
  }

  if (memory.avoided_focus_windows.length > 0) {
    lines.push(`Avoided focus windows: ${memory.avoided_focus_windows.map(formatWindow).join('; ')}`);
  }

  if (memory.learned_rules.length > 0) {
    lines.push(`Learned rules: ${memory.learned_rules.map((rule) => rule.text).join(' | ')}`);
  }

  if (memory.disliked_patterns.length > 0) {
    lines.push(`Avoid patterns: ${memory.disliked_patterns.map((pattern) => pattern.label).join(', ')}`);
  }

  if (memory.accepted_patterns.length > 0) {
    lines.push(`Known good patterns: ${memory.accepted_patterns.map((pattern) => pattern.label).join(', ')}`);
  }

  // --- Enhanced memory context ---
  if (memory.task_duration_preferences.length > 0) {
    lines.push(`Task duration preferences: ${memory.task_duration_preferences.map(p => `${p.category} → ${p.preferred_minutes}m`).join(', ')}`);
  }

  if (memory.task_time_preferences.length > 0) {
    lines.push(`Task time-of-day preferences: ${memory.task_time_preferences.map(p => `${p.category} → ${p.preferred_time}`).join(', ')}`);
  }

  if (memory.task_grouping_preferences.length > 0) {
    lines.push(`Task grouping (habit stacking): ${memory.task_grouping_preferences.map(p => `${p.task_a} + ${p.task_b}`).join(', ')}`);
  }

  if (memory.tone_preference.avoid_phrases.length > 0) {
    lines.push(`CRITICAL - AVOID THESE PHRASES: ${memory.tone_preference.avoid_phrases.join(', ')}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 5A: MEMORY COMPACTION
// ---------------------------------------------------------------------------

const COMPACTION_STALE_DAYS = 14;
const COMPACTION_COOLDOWN_DAYS = 7;
const COMPACTION_RULE_THRESHOLD = 15;
const COMPACTION_PATTERN_THRESHOLD = 12;

/**
 * Determines if the memory needs compaction.
 * Triggers when:
 *  - learned_rules exceed the threshold
 *  - disliked/accepted patterns exceed the threshold
 *  - last compaction was more than 7 days ago (and memory is non-empty)
 */
export function shouldCompact(
  memory: UserAiMemory,
  lastCompactedAt: string | null | undefined
): boolean {
  const hasContent =
    memory.learned_rules.length > 0 ||
    memory.disliked_patterns.length > 0 ||
    memory.accepted_patterns.length > 0;

  if (!hasContent) return false;

  // Threshold check
  if (memory.learned_rules.length > COMPACTION_RULE_THRESHOLD) return true;
  if (memory.disliked_patterns.length > COMPACTION_PATTERN_THRESHOLD) return true;
  if (memory.accepted_patterns.length > COMPACTION_PATTERN_THRESHOLD) return true;

  // Cooldown check
  if (!lastCompactedAt) return hasContent; // never compacted but has content
  const daysSince = (Date.now() - new Date(lastCompactedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > COMPACTION_COOLDOWN_DAYS;
}

/**
 * Compacts memory by:
 * 1. Pruning stale rules (low confidence + single evidence + older than 14 days)
 * 2. Deduplicating patterns with the same label (keeping highest count)
 * 3. Sorting rules by confidence descending so the strongest ones survive the cap
 * 4. Stamping last_compacted_at
 */
export async function compactMemory(
  supabase: SupabaseServerClient,
  userId: string,
  memory: UserAiMemory
): Promise<UserAiMemory> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - COMPACTION_STALE_DAYS * 24 * 60 * 60 * 1000);

  // 1. Prune stale rules
  const prunedRules = memory.learned_rules.filter((rule) => {
    // Keep rules with strong evidence regardless of age
    if (rule.confidence >= 0.5 || rule.evidence_count > 1) return true;
    // Drop low-confidence, single-evidence rules older than the threshold
    if (rule.last_seen_at && new Date(rule.last_seen_at) < staleThreshold) return false;
    return true;
  });

  // 2. Sort by confidence descending so strongest survive the cap
  const sortedRules = prunedRules.sort((a, b) => b.confidence - a.confidence).slice(0, 30);

  // 3. Deduplicate patterns
  const compactedDisliked = deduplicatePatterns(memory.disliked_patterns).slice(0, 20);
  const compactedAccepted = deduplicatePatterns(memory.accepted_patterns).slice(0, 20);

  const compacted: UserAiMemory = {
    ...memory,
    learned_rules: sortedRules,
    disliked_patterns: compactedDisliked,
    accepted_patterns: compactedAccepted,
  };

  // 4. Write compacted memory + stamp
  const dbPayload = memoryToDb(compacted);
  const { data, error } = await supabase
    .from('user_ai_memory')
    .update({
      ...dbPayload,
      last_compacted_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('[user-ai-memory] compaction error:', error);
    return memory; // return un-compacted if write fails
  }

  console.log(`[user-ai-memory] compacted for ${userId}: rules ${memory.learned_rules.length}->${sortedRules.length}, disliked ${memory.disliked_patterns.length}->${compactedDisliked.length}, accepted ${memory.accepted_patterns.length}->${compactedAccepted.length}`);
  return parseUserAiMemory(data);
}

/** Merge patterns that share the same label, keeping the one with the highest count. */
function deduplicatePatterns(
  patterns: UserAiMemory['disliked_patterns']
): UserAiMemory['disliked_patterns'] {
  const map = new Map<string, UserAiMemory['disliked_patterns'][number]>();
  for (const p of patterns) {
    const key = `${p.feature}::${p.label}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, p);
    } else {
      // Merge: keep the one with the higher count, combine counts
      map.set(key, {
        ...existing,
        count: existing.count + p.count,
        detail: p.detail || existing.detail,
        last_seen_at: newerDate(existing.last_seen_at, p.last_seen_at),
      });
    }
  }
  return Array.from(map.values());
}

function newerDate(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

// ---------------------------------------------------------------------------
// 5B: CONSTRAINT CANDIDATE MINING
// ---------------------------------------------------------------------------

export interface ConstraintCandidate {
  id: string;
  label: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  evidence_count: number;
  reason: string;
}

/**
 * Scans ai_feedback for repeated wrong_time rejections and groups them into
 * time-of-day buckets. If any bucket has >= `minEvidence` rejections in the
 * last `lookbackDays` days, it proposes an avoided window.
 *
 * No API keys are used — this is pure database analysis.
 */
export async function mineConstraintCandidates(
  supabase: SupabaseServerClient,
  userId: string,
  lookbackDays = 14,
  minEvidence = 3
): Promise<ConstraintCandidate[]> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  // Fetch relevant feedback
  const { data: feedback, error } = await supabase
    .from('ai_feedback')
    .select('suggestion_json, created_at')
    .eq('user_id', userId)
    .eq('action', 'reject')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error || !feedback || feedback.length === 0) return [];

  // Also get wrong_time feedback from the specific feature
  const { data: wrongTimeFeedback } = await supabase
    .from('ai_feedback')
    .select('suggestion_json, created_at')
    .eq('user_id', userId)
    .eq('feature_name', 'daily_plan_schedule_block')
    .in('action', ['reject'])
    .gte('created_at', since);

  const allFeedback = [...feedback, ...(wrongTimeFeedback || [])];

  // Group by time-of-day buckets
  const buckets: Record<string, { count: number; label: string; start: string; end: string }> = {
    early_morning: { count: 0, label: 'Early Morning', start: '05:00', end: '08:00' },
    morning:       { count: 0, label: 'Morning',       start: '08:00', end: '12:00' },
    early_afternoon: { count: 0, label: 'Early Afternoon', start: '12:00', end: '14:00' },
    late_afternoon:  { count: 0, label: 'Late Afternoon',  start: '14:00', end: '17:00' },
    evening:       { count: 0, label: 'Evening',       start: '17:00', end: '21:00' },
    night:         { count: 0, label: 'Night',         start: '21:00', end: '23:59' },
  };

  for (const fb of allFeedback) {
    const json = fb.suggestion_json as Record<string, unknown> | null;
    // Try to extract a time from the suggestion
    const startTime = json?.start_time || json?.time || json?.start;
    if (typeof startTime !== 'string') continue;

    // Parse hour from time string (supports "14:00", "2:00 PM", ISO timestamps)
    const hour = parseHourFromTimeString(startTime);
    if (hour === null) continue;

    if (hour >= 5 && hour < 8)       buckets.early_morning.count++;
    else if (hour >= 8 && hour < 12) buckets.morning.count++;
    else if (hour >= 12 && hour < 14) buckets.early_afternoon.count++;
    else if (hour >= 14 && hour < 17) buckets.late_afternoon.count++;
    else if (hour >= 17 && hour < 21) buckets.evening.count++;
    else if (hour >= 21)             buckets.night.count++;
  }

  // Get the user's current avoided windows to skip already-learned ones
  const memory = await getUserAIMemory(supabase, userId);
  const existingLabels = new Set(
    memory.avoided_focus_windows.map((w) => w.label.toLowerCase())
  );

  // Propose candidates where evidence meets the threshold
  const candidates: ConstraintCandidate[] = [];
  for (const [key, bucket] of Object.entries(buckets)) {
    if (bucket.count >= minEvidence && !existingLabels.has(bucket.label.toLowerCase())) {
      candidates.push({
        id: `constraint-${key}-${Date.now()}`,
        label: bucket.label,
        start: bucket.start,
        end: bucket.end,
        evidence_count: bucket.count,
        reason: `You rejected ${bucket.count} scheduled blocks during ${bucket.label.toLowerCase()} in the last ${lookbackDays} days.`,
      });
    }
  }

  return candidates;
}

function parseHourFromTimeString(time: string): number | null {
  // ISO timestamp: "2026-05-04T14:30:00Z"
  const isoMatch = time.match(/T(\d{2}):\d{2}/);
  if (isoMatch) return parseInt(isoMatch[1], 10);

  // 24h format: "14:00"
  const h24 = time.match(/^(\d{1,2}):\d{2}$/);
  if (h24) return parseInt(h24[1], 10);

  // 12h format: "2:00 PM"
  const h12 = time.match(/^(\d{1,2}):\d{2}\s*(AM|PM)$/i);
  if (h12) {
    let hour = parseInt(h12[1], 10);
    if (h12[2].toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (h12[2].toUpperCase() === 'AM' && hour === 12) hour = 0;
    return hour;
  }

  return null;
}

function memoryToDb(memory: UserAiMemory) {
  return {
    preferred_focus_windows: memory.preferred_focus_windows as Json,
    avoided_focus_windows: memory.avoided_focus_windows as Json,
    break_preference: memory.break_preference as Json,
    planning_style: memory.planning_style as Json,
    tone_preference: memory.tone_preference as Json,
    task_detail_preference: memory.task_detail_preference as Json,
    recurring_constraints: memory.recurring_constraints as Json,
    learned_rules: memory.learned_rules as Json,
    disliked_patterns: memory.disliked_patterns as Json,
    accepted_patterns: memory.accepted_patterns as Json,
    source_counters: memory.source_counters as Json,
    // The following fields exist in types but appear to be missing from the Supabase 
    // remote schema cache or table, causing postgREST to reject saves:
    // memory_learning_settings: memory.memory_learning_settings as Json,
    // task_duration_preferences: memory.task_duration_preferences as Json,
    // task_time_preferences: memory.task_time_preferences as Json,
    // task_grouping_preferences: memory.task_grouping_preferences as Json,
  };
}

function formatWindow(window: z.infer<typeof memoryWindowSchema>): string {
  const days = window.days.length > 0 ? ` on ${window.days.join(', ')}` : '';
  return `${window.label} ${window.start}-${window.end}${days}`;
}

function upsertPattern(
  patterns: UserAiMemory['disliked_patterns'],
  next: UserAiMemory['disliked_patterns'][number]
) {
  const existing = patterns.find((pattern) => pattern.label === next.label && pattern.feature === next.feature);
  if (!existing) return [...patterns, next].slice(-20);

  return patterns.map((pattern) => {
    if (pattern.label !== next.label || pattern.feature !== next.feature) return pattern;
    return {
      ...pattern,
      detail: next.detail || pattern.detail,
      count: pattern.count + 1,
      last_seen_at: next.last_seen_at,
    };
  });
}

function upsertRule(
  rules: UserAiMemory['learned_rules'],
  next: UserAiMemory['learned_rules'][number]
) {
  const existing = rules.find((rule) => rule.id === next.id);
  if (!existing) return [...rules, next].slice(-30);

  return rules.map((rule) => {
    if (rule.id !== next.id) return rule;
    return {
      ...rule,
      confidence: Math.min(1, Math.max(rule.confidence, next.confidence) + 0.05),
      evidence_count: rule.evidence_count + 1,
      last_seen_at: next.last_seen_at,
    };
  });
}

function incrementCounter(counters: UserAiMemory['source_counters'], key: string) {
  return {
    ...counters,
    [key]: (counters[key] || 0) + 1,
  };
}

// ---------------------------------------------------------------------------
// PLAN DRAFT FEEDBACK: Learn from approved plans
// ---------------------------------------------------------------------------

export interface PlanDraftItem {
  title: string;
  start_time: string;
  end_time: string;
  energy_level: 'high' | 'medium' | 'low';
  execution_description: string;
}

/**
 * When a user approves a plan draft, we extract patterns from the approved items
 * and update the memory to make future drafts smarter.
 */
export async function recordPlanFeedbackInMemory(
  supabase: SupabaseServerClient,
  userId: string,
  approvedItems: PlanDraftItem[]
): Promise<UserAiMemory> {
  const current = await getUserAIMemory(supabase, userId);
  if (!current.memory_learning_settings.learning_enabled) {
    return current;
  }
  
  const now = new Date().toISOString();

  let updatedDurationPrefs = [...current.task_duration_preferences];
  let updatedTimePrefs = [...current.task_time_preferences];
  let updatedGroupingPrefs = [...current.task_grouping_preferences];

  for (const item of approvedItems) {
    // 1. Learn duration preferences
    const startMs = new Date(item.start_time).getTime();
    const endMs = new Date(item.end_time).getTime();
    const durationMinutes = Math.round((endMs - startMs) / 60000);

    if (durationMinutes > 0 && durationMinutes <= 480) {
      const category = extractCategory(item.title);
      updatedDurationPrefs = upsertDurationPref(updatedDurationPrefs, {
        category,
        preferred_minutes: durationMinutes,
        evidence_count: 1,
        last_seen_at: now,
      });
    }

    // 2. Learn time-of-day preferences
    const hour = new Date(item.start_time).getHours();
    const timeSlot = hourToTimeSlot(hour);
    const category = extractCategory(item.title);
    updatedTimePrefs = upsertTimePref(updatedTimePrefs, {
      category,
      preferred_time: timeSlot,
      evidence_count: 1,
      last_seen_at: now,
    });
  }

  // 3. Learn grouping preferences (consecutive items)
  for (let i = 0; i < approvedItems.length - 1; i++) {
    const a = approvedItems[i];
    const b = approvedItems[i + 1];
    const gapMs = new Date(b.start_time).getTime() - new Date(a.end_time).getTime();
    // If items are within 15 minutes of each other, consider them grouped
    if (gapMs >= 0 && gapMs <= 15 * 60000) {
      const catA = extractCategory(a.title);
      const catB = extractCategory(b.title);
      if (catA !== catB) {
        updatedGroupingPrefs = upsertGroupingPref(updatedGroupingPrefs, {
          task_a: catA,
          task_b: catB,
          evidence_count: 1,
          last_seen_at: now,
        });
      }
    }
  }

  return updateUserAIMemory(supabase, userId, {
    task_duration_preferences: updatedDurationPrefs.slice(-20),
    task_time_preferences: updatedTimePrefs.slice(-20),
    task_grouping_preferences: updatedGroupingPrefs.slice(-15),
    accepted_patterns: upsertPattern(current.accepted_patterns, {
      label: 'plan_draft_approved',
      detail: `User approved a plan with ${approvedItems.length} items.`,
      feature: 'plan_draft',
      count: 1,
      last_seen_at: now,
    }),
    source_counters: incrementCounter(current.source_counters, 'plan_draft_approved'),
  });
}

/** Extract a rough category from a task title (first meaningful word or emoji prefix). */
function extractCategory(title: string): string {
  // Strip leading emoji
  const cleaned = title.replace(/^[\p{Emoji}\s]+/u, '').trim();
  // Take first two words as a category
  const words = cleaned.split(/\s+/).slice(0, 2).join(' ');
  return words || title.slice(0, 30);
}

function hourToTimeSlot(hour: number): 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour < 7) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function upsertDurationPref(
  prefs: UserAiMemory['task_duration_preferences'],
  next: UserAiMemory['task_duration_preferences'][number]
) {
  const existing = prefs.find(p => p.category.toLowerCase() === next.category.toLowerCase());
  if (!existing) return [...prefs, next];
  return prefs.map(p => {
    if (p.category.toLowerCase() !== next.category.toLowerCase()) return p;
    // Weighted average of the preferred duration
    const totalEvidence = p.evidence_count + 1;
    const avgMinutes = Math.round((p.preferred_minutes * p.evidence_count + next.preferred_minutes) / totalEvidence);
    return {
      ...p,
      preferred_minutes: avgMinutes,
      evidence_count: totalEvidence,
      last_seen_at: next.last_seen_at,
    };
  });
}

function upsertTimePref(
  prefs: UserAiMemory['task_time_preferences'],
  next: UserAiMemory['task_time_preferences'][number]
) {
  const existing = prefs.find(p => p.category.toLowerCase() === next.category.toLowerCase());
  if (!existing) return [...prefs, next];
  return prefs.map(p => {
    if (p.category.toLowerCase() !== next.category.toLowerCase()) return p;
    return {
      ...p,
      // Only override if we have strong evidence (more than 2 times)
      preferred_time: p.evidence_count >= 2 ? p.preferred_time : next.preferred_time,
      evidence_count: p.evidence_count + 1,
      last_seen_at: next.last_seen_at,
    };
  });
}

function upsertGroupingPref(
  prefs: UserAiMemory['task_grouping_preferences'],
  next: UserAiMemory['task_grouping_preferences'][number]
) {
  const existing = prefs.find(p =>
    (p.task_a.toLowerCase() === next.task_a.toLowerCase() && p.task_b.toLowerCase() === next.task_b.toLowerCase()) ||
    (p.task_a.toLowerCase() === next.task_b.toLowerCase() && p.task_b.toLowerCase() === next.task_a.toLowerCase())
  );
  if (!existing) return [...prefs, next];
  return prefs.map(p => {
    const matches =
      (p.task_a.toLowerCase() === next.task_a.toLowerCase() && p.task_b.toLowerCase() === next.task_b.toLowerCase()) ||
      (p.task_a.toLowerCase() === next.task_b.toLowerCase() && p.task_b.toLowerCase() === next.task_a.toLowerCase());
    if (!matches) return p;
    return {
      ...p,
      evidence_count: p.evidence_count + 1,
      last_seen_at: next.last_seen_at,
    };
  });
}
