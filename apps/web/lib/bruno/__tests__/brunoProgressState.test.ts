import { describe, expect, it } from 'vitest';
import { deriveBrunoProgressState } from '@/lib/bruno/brunoProgressState';
import type { UIMessage } from 'ai';
import type { BrunoDataParts } from '@/lib/bruno/types';

type BrunoUIMessage = UIMessage<unknown, BrunoDataParts>;

describe('deriveBrunoProgressState', () => {
  it('returns fallback steps while chat is submitted', () => {
    const state = deriveBrunoProgressState({
      messages: [],
      chatStatus: 'submitted',
    });

    expect(state.isBrunoWorking).toBe(true);
    expect(state.progressSteps.length).toBeGreaterThan(0);
    expect(state.progressSummary).toBe('Reading your message');
  });

  it('merges server progress parts with tool steps', () => {
    const messages: BrunoUIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'data-bruno-progress',
            data: {
              phase: 'working',
              summary: 'Writing response',
              steps: [
                { id: 'read', label: 'Reading your message', status: 'done' },
                { id: 'generate', label: 'Writing response', status: 'active' },
              ],
            },
          },
          {
            type: 'tool-NOTION_CREATE_PAGE',
            toolCallId: 'tool-1',
            state: 'input-available',
            input: {},
          },
        ],
      },
    ];

    const state = deriveBrunoProgressState({
      messages,
      chatStatus: 'streaming',
    });

    expect(state.progressSummary).toBe('Writing response');
    expect(state.progressSteps.some((step) => step.id === 'tool:NOTION_CREATE_PAGE')).toBe(
      true
    );
    expect(
      state.progressSteps.find((step) => step.id === 'tool:NOTION_CREATE_PAGE')?.label
    ).toBe('Notion · Create page');
  });

  it('marks complete when server progress phase is complete', () => {
    const messages: BrunoUIMessage[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'data-bruno-progress',
            data: {
              phase: 'complete',
              summary: 'Done',
              steps: [{ id: 'generate', label: 'Writing response', status: 'done' }],
            },
          },
          { type: 'text', text: 'Here is your plan.' },
        ],
      },
    ];

    const state = deriveBrunoProgressState({
      messages,
      chatStatus: 'ready',
    });

    expect(state.isBrunoWorking).toBe(false);
    expect(state.progressSummary).toBe('Done');
    expect(state.assistantAnswerText).toBe('Here is your plan.');
  });
});
