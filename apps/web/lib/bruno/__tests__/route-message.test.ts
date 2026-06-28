import { describe, expect, it, vi } from 'vitest';
import {
  classifyBrunoRouteWithOpenAI,
  routeBrunoMessage,
} from '@/lib/bruno/routeMessage';
import { buildBrunoSystemPrompt } from '@/lib/bruno/brunoPrompts';
import {
  getBrunoProCapNotice,
  getBrunoProWarning,
  getBrunoUpgradeCard,
} from '@/lib/bruno/upgradeCards';

describe('routeBrunoMessage', () => {
  it('does not call the LLM router for app actions', async () => {
    const classify = vi.fn();
    const result = await routeBrunoMessage(
      { message: 'Add a task called read chapter 5' },
      { classify }
    );

    expect(result.decision.mode).toBe('app_action');
    expect(result.routeSource).toBe('deterministic');
    expect(classify).not.toHaveBeenCalled();
  });

  it('does not call the LLM router for an obvious mode', async () => {
    const classify = vi.fn();
    const result = await routeBrunoMessage(
      { message: 'Teach me AP Macro Unit 1 and quiz me' },
      { classify }
    );

    expect(result.decision.mode).toBe('academic_tutoring');
    expect(result.routeSource).toBe('obvious_mode');
    expect(classify).not.toHaveBeenCalled();
  });

  it('does not call the LLM router for document writing requests', async () => {
    const classify = vi.fn();
    const result = await routeBrunoMessage(
      { message: 'Draft a polished email asking my teacher for an extension' },
      { classify }
    );

    expect(result.decision.mode).toBe('document_writing');
    expect(result.routeSource).toBe('obvious_mode');
    expect(classify).not.toHaveBeenCalled();
  });

  it('uses the structured classifier for ambiguous messages', async () => {
    const classify = vi.fn().mockResolvedValue({
      mode: 'task_management',
      confidence: 0.74,
      needsCalendarContext: false,
      needsTaskContext: true,
      needsCanvasContext: false,
      estimatedOutputSize: 'medium',
      upgradeMoment: false,
      rationale: 'organizing a mixed task list',
    });

    const result = await routeBrunoMessage(
      { message: 'Can you help me figure out what matters here?' },
      { classify }
    );

    expect(result.routeSource).toBe('llm_router');
    expect(result.decision.mode).toBe('task_management');
    expect(classify).toHaveBeenCalledOnce();
  });

  it('fails safe to basic chat when the classifier throws', async () => {
    const result = await routeBrunoMessage(
      { message: 'Can you help me figure out what matters here?' },
      {
        classify: vi.fn().mockRejectedValue(new Error('router unavailable')),
      }
    );

    expect(result.routeSource).toBe('fallback');
    expect(result.decision.mode).toBe('basic_chat');
  });
});

describe('classifyBrunoRouteWithOpenAI', () => {
  it('requests strict structured output and validates the route', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  mode: 'daily_planning',
                  confidence: 0.8,
                  needsCalendarContext: true,
                  needsTaskContext: true,
                  needsCanvasContext: false,
                  estimatedOutputSize: 'medium',
                  upgradeMoment: false,
                  rationale: 'normal day planning',
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const result = await classifyBrunoRouteWithOpenAI(
      'Help me plan around a few things',
      {
        apiKey: 'test-key',
        fetcher,
      }
    );

    expect(result.mode).toBe('daily_planning');
    expect(fetcher).toHaveBeenCalledOnce();
    const request = fetcher.mock.calls[0][1] as RequestInit;
    expect(String(request.body)).toContain('"type":"json_schema"');
    expect(String(request.body)).toContain('"strict":true');
  });
});

describe('Bruno prompts and server notices', () => {
  it('adds the mode fragment and only the supplied context blocks', () => {
    const prompt = buildBrunoSystemPrompt({
      mode: 'deadline_rescue',
      userName: 'Sam',
      userPlan: 'free',
      localTime: 'Monday 3:00 PM',
      timeZone: 'America/Los_Angeles',
      pageContext: 'PAGE CONTEXT:\nTasks',
      memoryContext: 'Prefers short plans.',
      taskContext: '- Essay',
      calendarContext: '',
      canvasContext: '',
    });

    expect(prompt).toContain('DEADLINE RESCUE MODE');
    expect(prompt).toContain('CURRENT USER TASKS');
    expect(prompt).not.toContain('UPCOMING EVENTS');
    expect(prompt).not.toContain('CANVAS CONTEXT');
  });

  it('adds document-writing quality and integrity boundaries', () => {
    const prompt = buildBrunoSystemPrompt({
      mode: 'document_writing',
      userName: 'Sam',
      userPlan: 'free',
      localTime: 'Monday 3:00 PM',
      timeZone: 'America/Los_Angeles',
      pageContext: '',
      memoryContext: '',
      taskContext: '',
      calendarContext: '',
      canvasContext: '',
    });

    expect(prompt).toContain('DOCUMENT WRITING MODE');
    expect(prompt).toContain('Do not invent sources');
    expect(prompt).toContain('bracketed placeholder');
    expect(prompt).toContain('Do not help bypass AI detectors');
  });

  it('adds the short coding boundary to Bruno prompts', () => {
    const prompt = buildBrunoSystemPrompt({
      mode: 'coding_help',
      userName: 'Sam',
      userPlan: 'free',
      localTime: 'Monday 3:00 PM',
      timeZone: 'America/Los_Angeles',
      pageContext: '',
      memoryContext: '',
      taskContext: '',
      calendarContext: '',
      canvasContext: '',
    });

    expect(prompt).toContain('CODING HELP MODE');
    expect(prompt).toContain('do not generate whole websites');
    expect(prompt).toContain('under 40 lines');
    expect(prompt).toContain('Bruno is not a website/app code generator');
  });

  it('creates mode-specific upgrade and Pro cap notices', () => {
    expect(getBrunoUpgradeCard('academic_tutoring')?.title).toContain(
      'full tutoring'
    );
    expect(getBrunoUpgradeCard('coding_help')).toBeNull();
    expect(getBrunoProWarning(28).remaining).toBe(28);
    expect(getBrunoProCapNotice().title).toContain('monthly limit');
  });
});
