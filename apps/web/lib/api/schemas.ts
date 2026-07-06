import { z } from 'zod';

export const metricsTrackBodySchema = z.object({
  type: z.enum(['focus_time', 'task_completed', 'task_planned']),
  value: z.number().finite().nonnegative(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
});

export const googleCalendarsSaveBodySchema = z.object({
  selectedCalendarIds: z.array(z.string().min(1).max(256)).max(50),
});

export const composioConnectBodySchema = z.object({
  appName: z.string().min(1).max(64),
  redirectUrl: z.string().max(2048).optional(),
  reconnect: z.boolean().optional(),
});

export const emptyStrictBodySchema = z.object({}).strict();

export const scheduleBodySchema = emptyStrictBodySchema;

export const weeklyReviewBodySchema = emptyStrictBodySchema;

export const authSignInBodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256),
});

export const passwordPolicySchema = z.string().min(8).max(256);

export const authSignUpBodySchema = z.object({
  email: z.string().email().max(320),
  password: passwordPolicySchema,
  name: z.string().min(1).max(120),
  referralCode: z.string().max(64).optional(),
  nextPath: z.string().max(256).optional(),
});

export const authPasswordResetBodySchema = z.object({
  email: z.string().email().max(320),
});

export const authChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: passwordPolicySchema,
});

export const dailyPlanBodySchema = z.object({
  energyLevel: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  localTime: z.string().datetime({ offset: true }).optional(),
  timezone: z.string().max(64).optional(),
  todayStart: z.string().datetime({ offset: true }).optional(),
  todayEnd: z.string().datetime({ offset: true }).optional(),
  force: z.boolean().optional(),
});

export const stripeCheckoutBodySchema = z.object({
  interval: z.enum(['monthly', 'annual']).optional(),
  source: z.string().max(64).optional(),
  returnPath: z.string().max(512).optional(),
});

export const composioNotionDatabasesBodySchema = z.object({
  databaseIds: z.array(z.string().min(1).max(128)).max(50).optional().default([]),
});

export const composioDisconnectBodySchema = z.object({
  connectionId: z.string().min(1).max(128),
});

export const composioSlackSettingsBodySchema = z.object({
  channelIds: z.array(z.string().min(1).max(128)).max(100).optional().default([]),
  includeStarred: z.boolean().optional().default(true),
  includeDms: z.boolean().optional().default(false),
});

export const composioLinearSettingsBodySchema = z.object({
  teamIds: z.array(z.string().min(1).max(128)).max(50).optional().default([]),
  projectIds: z.array(z.string().min(1).max(128)).max(100).optional().default([]),
  includeCompleted: z.boolean().optional().default(false),
  assigneeFilter: z.enum(['me', 'all']).optional().default('all'),
});

export const calendarPreferencesSchema = z.object({
  default_view: z.string().max(32).optional(),
  start_hour: z.number().int().min(0).max(23).optional(),
  end_hour: z.number().int().min(1).max(24).optional(),
  show_completed: z.boolean().optional(),
});

export const planningStyleSchema = z.object({
  mode: z.enum(['strict', 'balanced', 'flexible']).optional(),
  max_planned_minutes_per_day: z.number().int().min(60).max(960).optional(),
  allow_buffers: z.boolean().optional(),
  rollover_style: z.enum(['automatic', 'review', 'manual']).optional(),
  weekly_review_day: z.string().max(16).optional(),
  weekly_review_time: z.string().max(16).optional(),
  work_hours: z.record(z.string(), z.unknown()).optional(),
});

export const breakPreferencesSchema = z.object({
  frequency: z.enum(['minimal', 'balanced', 'frequent']).optional(),
  preferred_minutes: z.number().int().min(5).max(60).optional(),
});

export const focusWindowsSchema = z.object({
  windows: z.array(z.object({
    start: z.string().max(8),
    end: z.string().max(8),
    days: z.array(z.string().max(16)).max(7).optional(),
  })).max(20).optional(),
});

export const brunoMemoryPatchSchema = z.object({
  tone: z.string().max(64).optional(),
  verbosity: z.string().max(32).optional(),
  proactive_suggestions: z.boolean().optional(),
}).passthrough();

export const canvasConnectionTestSchema = z.object({
  url: z.string().url().max(2048),
  token: z.string().min(1).max(4096),
});

export const canvasSaveCredentialsSchema = z.object({
  url: z.string().url().max(2048),
  token: z.string().min(1).max(4096),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  energy_preference: z.enum(['morning', 'afternoon', 'evening', 'night', 'chaos']).optional(),
  preferred_name: z.string().min(1).max(120).optional(),
  timezone: z.string().max(64).optional(),
  context_type: z.string().max(64).optional(),
  school_name: z.string().max(256).optional(),
  major_role: z.string().max(256).optional(),
  graduation_year: z.string().max(8).optional(),
  term_start: z.string().nullable().optional(),
  term_end: z.string().nullable().optional(),
  default_canvas_url: z.string().max(2048).optional(),
  workload_style: z.string().max(64).optional(),
  default_task_duration: z.number().int().min(5).max(480).optional(),
  preferred_planning_time: z.string().max(32).optional(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.string().min(1).max(320),
});

export const notificationPreferencesSchema = z.record(z.string(), z.unknown());

export const brunoExecuteBodySchema = z.object({
  proposalId: z.string().min(1).max(256),
  type: z.string().min(1).max(128),
  title: z.string().max(512).optional(),
  description: z.string().max(4000).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  userPrompt: z.string().max(10000).optional(),
  timeZone: z.string().max(128).optional(),
  conversationId: z.string().uuid().optional(),
}).passthrough();

export function parseJsonBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.flatten().formErrors.join('; ') || 'Invalid request body' };
  }
  return { success: true, data: result.data };
}
