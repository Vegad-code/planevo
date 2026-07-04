import { describe, expect, it } from 'vitest';
import {
  extractBrunoProposalsFromMessage,
  extractExecutedActionsFromMessage,
  extractIntegrationToolCallsFromMessage,
} from '@/lib/bruno/proposalExtraction';

const CREATE_TASK_INPUT = {
  type: 'CREATE_TASK',
  title: 'Read ch. 4',
  description: 'Add a reading task',
  payload: { taskTitle: 'Read ch. 4' },
};

describe('extractBrunoProposalsFromMessage', () => {
  it('maps an approval-requested tool part to a confirmable card with approvalId', () => {
    const proposals = extractBrunoProposalsFromMessage({
      parts: [
        {
          type: 'tool-propose_action',
          toolCallId: 'call-1',
          state: 'approval-requested',
          input: CREATE_TASK_INPUT,
          approval: { id: 'appr-1' },
        },
      ],
    });
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      id: 'call-1',
      type: 'CREATE_TASK',
      title: 'Read ch. 4',
      approvalId: 'appr-1',
      derivedStatus: 'idle',
    });
  });

  it('derives executing/cancelled from the approval response', () => {
    const approved = extractBrunoProposalsFromMessage({
      parts: [
        {
          type: 'tool-propose_action',
          toolCallId: 'call-1',
          state: 'approval-responded',
          input: CREATE_TASK_INPUT,
          approval: { id: 'appr-1', approved: true },
        },
      ],
    });
    expect(approved[0].derivedStatus).toBe('executing');

    const denied = extractBrunoProposalsFromMessage({
      parts: [
        {
          type: 'tool-propose_action',
          toolCallId: 'call-1',
          state: 'approval-responded',
          input: CREATE_TASK_INPUT,
          approval: { id: 'appr-1', approved: false },
        },
      ],
    });
    expect(denied[0].derivedStatus).toBe('cancelled');
  });

  it('maps executed loop outcomes to success/error and hides non-executed outputs', () => {
    const proposals = extractBrunoProposalsFromMessage({
      parts: [
        {
          type: 'tool-propose_action',
          toolCallId: 'call-1',
          state: 'output-available',
          input: CREATE_TASK_INPUT,
          output: {
            success: true,
            executed: true,
            proposalId: 'prop-1',
            data: { taskId: 't-1' },
          },
        },
        {
          type: 'tool-propose_action',
          toolCallId: 'call-2',
          state: 'output-available',
          input: { ...CREATE_TASK_INPUT, title: 'Failing' },
          output: { success: false, executed: true, error: 'Event not found' },
        },
        {
          type: 'tool-propose_action',
          toolCallId: 'call-3',
          state: 'output-available',
          input: { type: 'NO_ACTION', title: 'n/a' },
          output: { success: true, executed: false, message: 'No app change' },
        },
      ],
    });

    expect(proposals).toHaveLength(2);
    expect(proposals[0]).toMatchObject({ id: 'prop-1', derivedStatus: 'success' });
    expect(proposals[1]).toMatchObject({
      derivedStatus: 'error',
      derivedError: 'Event not found',
    });
  });

  it('keeps legacy persisted proposals confirmable via their proposalId', () => {
    const proposals = extractBrunoProposalsFromMessage({
      parts: [
        {
          type: 'tool-propose_action',
          toolCallId: 'call-1',
          state: 'output-available',
          input: CREATE_TASK_INPUT,
          output: { success: true, proposalId: 'prop-9' },
        },
      ],
    });
    expect(proposals[0]).toMatchObject({
      id: 'prop-9',
      derivedStatus: null,
    });
    expect(proposals[0].approvalId).toBeUndefined();
  });

  it('shapes a pending propose_plan input as an APPLY_PLAN card', () => {
    const proposals = extractBrunoProposalsFromMessage({
      parts: [
        {
          type: 'tool-propose_plan',
          toolCallId: 'plan-1',
          state: 'approval-requested',
          input: {
            summary: 'Clear Thursday and move everything to Friday',
            steps: [
              { type: 'UPDATE_CALENDAR_EVENT', title: 'Move gym' },
              { type: 'UPDATE_CALENDAR_EVENT', title: 'Move study block' },
            ],
          },
          approval: { id: 'appr-plan' },
        },
      ],
    });
    expect(proposals[0]).toMatchObject({
      type: 'APPLY_PLAN',
      approvalId: 'appr-plan',
      derivedStatus: 'idle',
    });
    expect(
      (proposals[0].payload as { steps: unknown[] }).steps
    ).toHaveLength(2);
  });

  it('still extracts workflow data-part proposals and ignores v4 toolInvocation parts', () => {
    const proposals = extractBrunoProposalsFromMessage({
      parts: [
        {
          type: 'data-bruno-action-proposals',
          data: {
            proposals: [
              {
                id: 'wf-1',
                type: 'UPDATE_CALENDAR_EVENT',
                title: 'Move dentist',
                description: 'Move to Friday 2pm',
              },
            ],
          },
        },
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolName: 'propose_action',
            args: CREATE_TASK_INPUT,
          },
        },
      ],
    });
    expect(proposals).toHaveLength(1);
    expect(proposals[0].id).toBe('wf-1');
  });
});

describe('extractExecutedActionsFromMessage', () => {
  it('returns only successful executed loop actions, typing plans as APPLY_PLAN', () => {
    const executed = extractExecutedActionsFromMessage({
      parts: [
        {
          type: 'tool-propose_action',
          toolCallId: 'call-1',
          state: 'output-available',
          input: CREATE_TASK_INPUT,
          output: { success: true, executed: true, proposalId: 'p1', data: { taskId: 't1' } },
        },
        {
          type: 'tool-propose_plan',
          toolCallId: 'plan-1',
          state: 'output-available',
          input: { summary: 'plan', steps: [] },
          output: { success: true, executed: true, proposalId: 'p2' },
        },
        {
          type: 'tool-propose_action',
          toolCallId: 'call-2',
          state: 'output-available',
          input: CREATE_TASK_INPUT,
          output: { success: false, executed: true, error: 'nope' },
        },
        {
          type: 'tool-propose_action',
          toolCallId: 'call-3',
          state: 'output-available',
          input: CREATE_TASK_INPUT,
          output: { success: true, proposalId: 'legacy' },
        },
      ],
    });
    expect(executed).toEqual([
      { actionType: 'CREATE_TASK', proposalId: 'p1', data: { taskId: 't1' } },
      { actionType: 'APPLY_PLAN', proposalId: 'p2', data: null },
    ]);
  });
});

describe('extractIntegrationToolCallsFromMessage', () => {
  it('maps Composio tool parts to status cards', () => {
    const calls = extractIntegrationToolCallsFromMessage({
      parts: [
        {
          type: 'tool-NOTION_CREATE_PAGE',
          toolCallId: 'n1',
          state: 'output-available',
          input: {},
          output: { successful: true, data: { url: 'https://notion.so/x' } },
        },
        {
          type: 'tool-SLACK_SEND_MESSAGE',
          toolCallId: 's1',
          state: 'output-error',
          input: {},
          errorText: 'channel missing',
        },
        { type: 'tool-propose_action', toolCallId: 'p1', state: 'input-available', input: {} },
      ],
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      toolName: 'NOTION_CREATE_PAGE',
      status: 'success',
      url: 'https://notion.so/x',
    });
    expect(calls[1]).toMatchObject({
      toolName: 'SLACK_SEND_MESSAGE',
      status: 'error',
      errorText: 'channel missing',
    });
  });
});
