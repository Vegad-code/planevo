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
