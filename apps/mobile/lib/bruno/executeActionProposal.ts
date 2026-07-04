import type { MobileActionProposal } from '@/components/bruno/BrunoActionProposalCard';
import { getBrunoApiUrl } from './chat-transport';
import {
  readBrunoExecuteActionResponse,
  type BrunoExecuteActionClientResult,
} from './executeResponse';

export type ExecuteBrunoActionProposalInput = {
  proposal: MobileActionProposal;
  accessToken: string;
  userPrompt?: string;
  timeZone?: string;
  apiUrl?: string;
};

export async function executeBrunoActionProposal({
  proposal,
  accessToken,
  userPrompt,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  apiUrl = getBrunoApiUrl(),
}: ExecuteBrunoActionProposalInput): Promise<BrunoExecuteActionClientResult> {
  const response = await fetch(`${apiUrl}/api/bruno/actions/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      proposalId: proposal.id,
      type: proposal.type,
      title: proposal.title,
      description: proposal.description,
      payload: proposal.payload,
      userPrompt,
      timeZone,
    }),
  });

  const result = await readBrunoExecuteActionResponse(response);
  if (!response.ok || !result.success) {
    return {
      ...result,
      success: false,
      error: result.error ?? 'Could not execute action',
    };
  }

  return result;
}
