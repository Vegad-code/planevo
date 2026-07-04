'use client';

import { useCallback, useState } from 'react';
import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import type { ExecutionStatus } from '@/components/bruno/BrunoActionProposalCard';
import { readBrunoExecuteActionResponse } from '@/lib/bruno/executeResponse';
import type { ExtractedBrunoProposal } from '@/lib/bruno/proposalExtraction';

/**
 * Fire the app-wide refresh events after a Bruno action executed (either via
 * the agent loop or the legacy execute endpoint).
 */
export function dispatchBrunoActionRefreshEvents(
  actionType: string,
  proposalId: string | null,
  result: unknown
): void {
  const detail = { actionType, proposalId, result };

  window.dispatchEvent(
    new CustomEvent('planevo:bruno-action-executed', { detail })
  );

  const touchesCalendar =
    actionType === 'CREATE_TIME_BLOCK' ||
    actionType === 'UPDATE_CALENDAR_EVENT' ||
    actionType === 'DELETE_CALENDAR_EVENT' ||
    actionType === 'UPDATE_DAILY_PLAN' ||
    actionType === 'APPLY_PLAN';
  const touchesTasks =
    actionType === 'CREATE_TASK' ||
    actionType === 'UPDATE_TASK' ||
    actionType === 'RESCHEDULE_TASK' ||
    actionType === 'DELETE_TASK' ||
    actionType === 'APPLY_PLAN';

  if (touchesCalendar) {
    window.dispatchEvent(
      new CustomEvent('planevo:calendar-events-changed', { detail })
    );
  }
  if (touchesTasks) {
    window.dispatchEvent(new CustomEvent('planevo:tasks-changed', { detail }));
  }
}

type ApprovalResponder = (input: {
  id: string;
  approved: boolean;
  options?: { body?: object };
}) => void | PromiseLike<void>;

export type BrunoProposalActionsConfig = {
  /** useChat's addToolApprovalResponse (agent-loop cards). */
  addToolApprovalResponse: ApprovalResponder;
  /** Chat request body for the auto-resubmit after approvals complete. */
  getRequestBody: () => object;
  getConversationId: () => string | null;
  /** Last user prompt, forwarded to the legacy execute endpoint. */
  getUserPrompt?: () => string | undefined;
};

/**
 * Confirm/cancel handlers for Bruno proposal cards, covering both modes:
 * agent-loop cards answer their approval request (the SDK resumes the stream
 * once all pending approvals are answered); legacy cards call
 * /api/bruno/actions/execute with the server-logged proposalId.
 */
export function useBrunoProposalActions(config: BrunoProposalActionsConfig) {
  const {
    addToolApprovalResponse,
    getRequestBody,
    getConversationId,
    getUserPrompt,
  } = config;
  const [actionStatuses, setActionStatuses] = useState<
    Record<string, ExecutionStatus>
  >({});
  const [actionErrors, setActionErrors] = useState<
    Record<string, string | null>
  >({});
  const [executingActions, setExecutingActions] = useState<
    Record<string, boolean>
  >({});
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);

  const executeProposal = useCallback(
    async (
      proposal: BrunoActionProposal
    ): Promise<{ ok: boolean; error?: string }> => {
      let alreadyProcessing = false;
      setExecutingActions((prev) => {
        if (prev[proposal.id]) alreadyProcessing = true;
        return { ...prev, [proposal.id]: true };
      });
      if (alreadyProcessing) return { ok: false, error: 'already_processing' };

      setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'executing' }));

      try {
        const response = await fetch('/api/bruno/actions/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposalId: proposal.id,
            type: proposal.type,
            title: proposal.title,
            description: proposal.description,
            payload: proposal.payload,
            userPrompt: getUserPrompt?.() || undefined,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            conversationId: getConversationId() || undefined,
          }),
        });

        const result = await readBrunoExecuteActionResponse(response);
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? 'Could not execute action');
        }

        setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'success' }));
        setActionErrors((prev) => ({ ...prev, [proposal.id]: null }));
        dispatchBrunoActionRefreshEvents(proposal.type, proposal.id, result);
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Couldn't complete that action. Try again.";
        if (!message.includes('Google Calendar write permission')) {
          console.error('[Bruno] Failed to execute proposal', error);
        }
        setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'error' }));
        setActionErrors((prev) => ({ ...prev, [proposal.id]: message }));
        return { ok: false, error: message };
      } finally {
        setExecutingActions((prev) => ({ ...prev, [proposal.id]: false }));
      }
    },
    [getConversationId, getUserPrompt]
  );

  const handleConfirmProposal = useCallback(
    async (proposal: BrunoActionProposal) => {
      const approvalId = (proposal as ExtractedBrunoProposal).approvalId;
      if (approvalId) {
        await addToolApprovalResponse({
          id: approvalId,
          approved: true,
          options: { body: getRequestBody() },
        });
        return;
      }
      await executeProposal(proposal);
    },
    [addToolApprovalResponse, executeProposal, getRequestBody]
  );

  const handleCancelProposal = useCallback(
    (proposal: BrunoActionProposal) => {
      const approvalId = (proposal as ExtractedBrunoProposal).approvalId;
      if (approvalId) {
        void addToolApprovalResponse({
          id: approvalId,
          approved: false,
          options: { body: getRequestBody() },
        });
        return;
      }
      setActionStatuses((prev) => ({ ...prev, [proposal.id]: 'cancelled' }));
    },
    [addToolApprovalResponse, getRequestBody]
  );

  const handleConfirmAll = useCallback(
    async (proposals: BrunoActionProposal[]) => {
      if (isConfirmingAll) return;
      setIsConfirmingAll(true);
      try {
        const approvalCards = proposals.filter(
          (proposal) => (proposal as ExtractedBrunoProposal).approvalId
        );
        const legacyCards = proposals.filter(
          (proposal) => !(proposal as ExtractedBrunoProposal).approvalId
        );

        for (const proposal of approvalCards) {
          await addToolApprovalResponse({
            id: (proposal as ExtractedBrunoProposal).approvalId as string,
            approved: true,
            options: { body: getRequestBody() },
          });
        }

        for (const proposal of legacyCards) {
          const result = await executeProposal(proposal);
          if (
            !result.ok &&
            (result.error?.includes('Google Calendar write permission') ||
              result.error?.includes('Event not found') ||
              result.error?.includes('already executed'))
          ) {
            break;
          }
        }
      } finally {
        setIsConfirmingAll(false);
      }
    },
    [addToolApprovalResponse, executeProposal, getRequestBody, isConfirmingAll]
  );

  return {
    actionStatuses,
    actionErrors,
    executingActions,
    isConfirmingAll,
    executeProposal,
    handleConfirmProposal,
    handleCancelProposal,
    handleConfirmAll,
  };
}
