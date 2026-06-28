"use client";

import { useState } from "react";
import type { BrunoActionProposal } from "@/lib/bruno/tools/types";
import { BrunoActionProposalCard, type ExecutionStatus } from "./BrunoActionProposalCard";
import { isV3ExecutableAction } from "@/lib/bruno/tools/actionLabels";
import { CheckSquareOffset } from "@phosphor-icons/react";

type BrunoProposalGroupProps = {
  proposals: BrunoActionProposal[];
  actionStatuses: Record<string, ExecutionStatus>;
  actionErrors: Record<string, string | null>;
  onConfirm: (proposal: BrunoActionProposal) => void | Promise<void>;
  onCancel: (proposal: BrunoActionProposal) => void;
  onConfirmAll?: (proposals: BrunoActionProposal[]) => void | Promise<void>;
};

export function BrunoProposalGroup({
  proposals,
  actionStatuses,
  actionErrors,
  onConfirm,
  onCancel,
  onConfirmAll,
}: BrunoProposalGroupProps) {
  const [isExpanded, setIsExpanded] = useState(proposals.length <= 3);

  const executableProposals = proposals.filter((p) => isV3ExecutableAction(p.type));
  const unexecutedCount = executableProposals.filter(
    (p) => actionStatuses[p.id] !== "success" && actionStatuses[p.id] !== "executing"
  ).length;

  const visibleProposals = isExpanded ? proposals : proposals.slice(0, 3);

  return (
    <div className="mt-3 space-y-3">
      {visibleProposals.map((proposal) => (
        <BrunoActionProposalCard
          key={proposal.id}
          proposal={proposal}
          executionStatus={actionStatuses[proposal.id] ?? "idle"}
          executionError={actionErrors[proposal.id]}
          onConfirm={onConfirm}
          onCancel={onCancel}
          compact={true}
        />
      ))}

      {proposals.length > 3 && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full rounded-xl border border-dashed border-white/20 px-4 py-2 text-xs font-medium text-white/60 hover:border-white/40 hover:text-white/80 transition-colors"
        >
          + Show {proposals.length - 3} more
        </button>
      )}

      {unexecutedCount > 1 && onConfirmAll && (
        <button
          type="button"
          onClick={() =>
            onConfirmAll(
              executableProposals.filter(
                (p) => actionStatuses[p.id] !== 'success' && actionStatuses[p.id] !== 'executing'
              )
            )
          }
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d99043]/20 px-4 py-2.5 text-sm font-semibold text-[#d99043] transition-colors hover:bg-[#d99043]/30"
        >
          <CheckSquareOffset weight="bold" />
          Confirm All ({unexecutedCount})
        </button>
      )}
    </div>
  );
}
