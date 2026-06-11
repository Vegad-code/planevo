'use client';

import { useState, useCallback } from 'react';
import type { Task, AITaskResponse } from '@/types/tasks';

/**
 * Planevo v1: AI task prioritization and feedback have been folded into
 * Bruno Chat (function-calling agent). The standalone /api/ai/prioritize and
 * /api/ai/feedback endpoints are archived per STRATEGY.md §6.
 *
 * This hook is kept as a no-op so existing UI (EnhancedTasks) compiles and
 * renders without an AI suggestion overlay. To re-enable AI prioritization,
 * users now ask Bruno directly: "Prioritize my tasks for today."
 *
 * TODO (Block G — retention): wire the new Bruno agent's "prioritize" tool
 * call into this hook so the Tasks page can show Bruno-suggested ordering
 * inline again.
 */
export function useTaskAI() {
  const [aiResponse] = useState<AITaskResponse | null>(null);
  const [aiLoading] = useState(false);
  const [aiError] = useState<string | null>(null);
  const [feedbackLoading] = useState(false);

  const fetchAIPriorities = useCallback(async (_tasks: Task[]) => {
    // No-op in v1. See header comment.
  }, []);

  const invalidateCache = useCallback(() => {
    // No-op in v1.
  }, []);

  const logFeedback = useCallback(
    async (
      _feature: string,
      _suggestion: unknown,
      _action: 'accept' | 'reject',
      _correction?: string
    ) => {
      // No-op in v1. Feedback is captured implicitly via Bruno chat history.
      return true;
    },
    []
  );

  return {
    aiResponse,
    aiLoading,
    aiError,
    fetchAIPriorities,
    invalidateCache,
    logFeedback,
    feedbackLoading,
  };
}
