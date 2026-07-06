/**
 * Planevo Command — extraction output validation.
 *
 * Source of truth: docs/superpowers/plans/comprehensive.md §18.
 * The model must return JSON matching `commandExtractionSchema`. On validation
 * failure the caller retries once with a correction prompt; on a second
 * failure the raw input is saved as an unsorted note-like responsibility.
 */

import { z } from 'zod';

export const responsibilityTypeSchema = z.enum([
  'assignment',
  'assessment',
  'meeting',
  'class',
  'practice',
  'work_deadline',
  'follow_up',
  'errand',
  'family',
  'money',
  'health',
  'creative',
  'idea',
  'habit_like_routine',
  'admin',
  'unknown',
]);

export const responsibilityPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const extractedResponsibilitySchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).nullable(),
  type: responsibilityTypeSchema,
  dueText: z.string().nullable(),
  dueAt: z.string().datetime({ offset: true }).nullable(),
  startAt: z.string().datetime({ offset: true }).nullable(),
  endAt: z.string().datetime({ offset: true }).nullable(),
  timezone: z.string().nullable(),
  recurrenceRule: z.string().nullable(),
  priority: responsibilityPrioritySchema,
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  reviewReason: z.string().nullable(),
  whyItMatters: z.string().nullable(),
  sourceHints: z.array(z.string()).default([]),
});

export const commandExtractionSchema = z.object({
  summary: z.string().max(400),
  items: z.array(extractedResponsibilitySchema).max(50),
  clarificationQuestions: z.array(z.string().max(160)).max(5),
  confidence: z.number().min(0).max(1),
});

export type ExtractedResponsibilityParsed = z.infer<typeof extractedResponsibilitySchema>;
export type CommandExtractionParsed = z.infer<typeof commandExtractionSchema>;
