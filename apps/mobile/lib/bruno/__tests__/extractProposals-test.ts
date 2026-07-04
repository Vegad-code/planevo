import { extractProposalsFromMessage } from '../extractProposals';
import type { BrunoUIMessage } from '../types';

describe('extractProposalsFromMessage', () => {
  it('prefers the server proposalId returned by propose_action output', () => {
    const message = {
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-propose_action',
          toolCallId: 'call-1',
          input: {
            type: 'CREATE_TIME_BLOCK',
            title: 'Focus block',
            description: 'Add a focus block tomorrow.',
            riskLevel: 'low',
            requiresConfirmation: true,
            payload: { startTime: '2026-07-02T16:00:00.000Z' },
          },
          output: {
            success: true,
            proposalId: 'proposal-server-1',
          },
        },
      ],
    } as unknown as BrunoUIMessage;

    expect(extractProposalsFromMessage(message)).toEqual([
      expect.objectContaining({
        id: 'proposal-server-1',
        type: 'CREATE_TIME_BLOCK',
        title: 'Focus block',
      }),
    ]);
  });

  it('extracts deterministic server proposal batches', () => {
    const message = {
      id: 'assistant-2',
      role: 'assistant',
      parts: [
        {
          type: 'data-bruno-action-proposals',
          data: {
            type: 'bruno_action_proposals',
            source: 'deterministic_app_action_workflow',
            proposals: [
              {
                id: 'proposal-batch-1',
                type: 'UPDATE_TASK',
                title: 'Move task',
                description: 'Move the task to tomorrow.',
                riskLevel: 'low',
                requiresConfirmation: true,
                payload: { taskId: 'task-1' },
              },
            ],
          },
        },
      ],
    } as unknown as BrunoUIMessage;

    expect(extractProposalsFromMessage(message)).toEqual([
      expect.objectContaining({
        id: 'proposal-batch-1',
        type: 'UPDATE_TASK',
        payload: { taskId: 'task-1' },
      }),
    ]);
  });
});

describe('extractProposalsFromMessage propose_plan', () => {
  it('renders a propose_plan tool part as an APPLY_PLAN proposal', () => {
    const message = {
      id: 'assistant-3',
      role: 'assistant',
      parts: [
        {
          type: 'tool-propose_plan',
          toolCallId: 'plan-call-1',
          input: {
            summary: 'Clear Thursday and move everything to Friday',
            steps: [
              { type: 'UPDATE_CALENDAR_EVENT', title: 'Move gym' },
              { type: 'UPDATE_CALENDAR_EVENT', title: 'Move study block' },
            ],
          },
          output: {
            success: true,
            proposalId: 'proposal-plan-1',
            proposal: {
              id: 'proposal-plan-1',
              type: 'APPLY_PLAN',
              title: 'Clear Thursday and move everything to Friday',
              description: 'Clear Thursday and move everything to Friday',
              riskLevel: 'medium',
              requiresConfirmation: true,
              payload: {
                planSummary: 'Clear Thursday and move everything to Friday',
                steps: [
                  { type: 'UPDATE_CALENDAR_EVENT', title: 'Move gym' },
                  { type: 'UPDATE_CALENDAR_EVENT', title: 'Move study block' },
                ],
              },
            },
          },
        },
      ],
    } as unknown as BrunoUIMessage;

    const proposals = extractProposalsFromMessage(message);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toEqual(
      expect.objectContaining({
        id: 'proposal-plan-1',
        type: 'APPLY_PLAN',
        requiresConfirmation: true,
      })
    );
    expect((proposals[0].payload.steps as unknown[]).length).toBe(2);
  });

  it('shapes a plan card from raw input when no server proposal exists yet', () => {
    const message = {
      id: 'assistant-4',
      role: 'assistant',
      parts: [
        {
          type: 'tool-propose_plan',
          toolCallId: 'plan-call-2',
          input: {
            summary: 'Plan my finals week',
            steps: [{ type: 'CREATE_TASK', title: 'Outline essay' }],
          },
        },
      ],
    } as unknown as BrunoUIMessage;

    const proposals = extractProposalsFromMessage(message);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].type).toBe('APPLY_PLAN');
    expect(proposals[0].title).toBe('Plan my finals week');
  });
});
