import { describe, expect, it } from 'vitest';
import { normalizeDailyPlanCandidates } from '../normalizer';

describe('normalizeDailyPlanCandidates', () => {
  it('maps native tasks and applies default duration', () => {
    const result = normalizeDailyPlanCandidates({
      defaultDurationMinutes: 50,
      tasks: [
        {
          id: 'task-1',
          title: 'Draft memo',
          notes: 'Write first version',
          due_date: '2026-07-03T22:00:00.000Z',
          estimated_minutes: null,
          priority: 'high',
          status: 'todo',
        },
      ],
      sourceItems: [],
      canvasAssignments: [],
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'task:task-1',
        rawSourceId: 'task-1',
        source: 'task',
        title: 'Draft memo',
        estimatedMinutes: 50,
        priority: 'high',
        confidenceSignals: expect.arrayContaining(['native_task', 'due_date', 'priority:high']),
      }),
    ]);
  });

  it('excludes closed source items and normalizes active work integrations', () => {
    const result = normalizeDailyPlanCandidates({
      defaultDurationMinutes: 45,
      tasks: [],
      canvasAssignments: [],
      sourceItems: [
        {
          id: 'done-linear',
          provider: 'linear',
          title: 'Already shipped',
          description: null,
          due_date: '2026-07-04T12:00:00.000Z',
          url: 'https://linear.app/issue/DONE',
          raw_data: {},
          status: 'Done',
          completed: false,
          priority: 'high',
          item_type: 'issue',
        },
        {
          id: 'linear-1',
          provider: 'linear',
          title: 'Fix importer',
          description: 'Import fails on stale records',
          due_date: '2026-07-04T12:00:00.000Z',
          url: 'https://linear.app/issue/BUG',
          raw_data: {},
          status: 'In Progress',
          completed: false,
          priority: 'urgent',
          item_type: 'issue',
        },
        {
          id: 'slack-1',
          provider: 'slack',
          title: '@alex can you review this today?',
          description: null,
          due_date: null,
          url: 'https://slack.com/archives/C1/p1',
          raw_data: { channel_name: 'ops' },
          status: null,
          completed: false,
          priority: null,
          item_type: 'message',
        },
      ],
    });

    expect(result.map((item) => item.id)).toEqual(['linear:linear-1', 'slack:slack-1']);
    expect(result[0]).toMatchObject({
      source: 'linear',
      priority: 'urgent',
      estimatedMinutes: 45,
      confidenceSignals: expect.arrayContaining(['work_integration', 'provider:linear']),
    });
    expect(result[1]).toMatchObject({
      source: 'slack',
      priority: 'medium',
      confidenceSignals: expect.arrayContaining(['communication', 'direct_ask']),
    });
  });

  it('prefers source_items Canvas rows and falls back to canvas_assignments', () => {
    const fromSourceItems = normalizeDailyPlanCandidates({
      defaultDurationMinutes: 40,
      tasks: [],
      canvasAssignments: [
        {
          id: 'assignment-fallback',
          name: 'Fallback assignment',
          description: null,
          due_at: '2026-07-05T23:59:00.000Z',
          html_url: 'https://canvas.example/a',
          course_name: 'History',
        },
      ],
      sourceItems: [
        {
          id: 'canvas-source',
          provider: 'canvas',
          title: 'Canvas source item',
          description: null,
          due_date: '2026-07-04T23:59:00.000Z',
          url: 'https://canvas.example/source',
          raw_data: { course_name: 'Math' },
          status: 'open',
          completed: false,
          priority: null,
          item_type: 'assignment',
        },
      ],
    });

    expect(fromSourceItems.map((item) => item.id)).toEqual(['canvas:canvas-source']);

    const fallback = normalizeDailyPlanCandidates({
      defaultDurationMinutes: 40,
      tasks: [],
      canvasAssignments: [
        {
          id: 'assignment-fallback',
          name: 'Fallback assignment',
          description: null,
          due_at: '2026-07-05T23:59:00.000Z',
          html_url: 'https://canvas.example/a',
          course_name: 'History',
        },
      ],
      sourceItems: [],
    });

    expect(fallback).toEqual([
      expect.objectContaining({
        id: 'canvas:assignment-fallback',
        source: 'canvas',
        title: 'Fallback assignment',
        priority: 'high',
        confidenceSignals: expect.arrayContaining(['canvas_assignment', 'due_date']),
      }),
    ]);
  });
});
