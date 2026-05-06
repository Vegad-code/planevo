'use client';

import { useState, useCallback, useRef } from 'react';
import type { Task, AITaskResponse } from '@/types/database';

const AI_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function useTaskAI() {
  const [aiResponse, setAiResponse] = useState<AITaskResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const cacheRef = useRef<{ data: AITaskResponse; timestamp: number; fingerprint: string } | null>(null);

  const fetchAIPriorities = useCallback(async (tasks: Task[]) => {
    // Only call if there are incomplete tasks
    const incompleteTasks = tasks.filter(t => !t.completed);
    if (incompleteTasks.length === 0) {
      setAiResponse(null);
      return;
    }

    // Create a fingerprint of the current tasks
    const fingerprint = JSON.stringify(incompleteTasks.map(t => ({ id: t.id, title: t.title, completed: t.completed })));

    // Check cache: if it matches fingerprint AND is within duration
    if (
      cacheRef.current && 
      cacheRef.current.fingerprint === fingerprint &&
      Date.now() - cacheRef.current.timestamp < AI_CACHE_DURATION
    ) {
      setAiResponse(cacheRef.current.data);
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: incompleteTasks }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const data: AITaskResponse = await response.json();
      cacheRef.current = { data, timestamp: Date.now(), fingerprint };
      setAiResponse(data);
    } catch (err) {
      console.error('AI prioritization failed:', err);
      setAiError('AI suggestions temporarily unavailable');
      setAiResponse(null);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Invalidate cache (e.g., after task completion)
  const invalidateCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  return {
    aiResponse,
    aiLoading,
    aiError,
    fetchAIPriorities,
    invalidateCache,
    logFeedback: async (feature: string, suggestion: unknown, action: 'accept' | 'reject', correction?: string) => {
      setFeedbackLoading(true);
      try {
        const response = await fetch('/api/ai/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature_name: feature,
            suggestion_json: suggestion,
            action,
            correction_text: correction,
          }),
        });
        return response.ok;
      } catch (err) {
        console.error('Failed to log feedback:', err);
        return false;
      } finally {
        setFeedbackLoading(false);
      }
    },
    feedbackLoading,
  };
}
