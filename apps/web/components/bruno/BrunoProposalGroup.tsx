"use client";

import { useState } from "react";
import type { BrunoActionProposal } from "@/lib/bruno/tools/types";
import { BrunoActionProposalCard, type ExecutionStatus } from "./BrunoActionProposalCard";
import { isV3ExecutableAction } from "@/lib/bruno/tools/actionLabels";
import { CheckSquareOffset, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type BrunoProposalGroupProps = {
  proposals: BrunoActionProposal[];
  actionStatuses: Record<string, ExecutionStatus>;
  actionErrors: Record<string, string | null>;
  onConfirm: (proposal: BrunoActionProposal) => void | Promise<void>;
  onCancel: (proposal: BrunoActionProposal) => void;
  onConfirmAll?: (proposals: BrunoActionProposal[]) => void | Promise<void>;
  isConfirmingAll?: boolean;
};

export function BrunoProposalGroup({
  proposals,
  actionStatuses,
  actionErrors,
  onConfirm,
  onCancel,
  onConfirmAll,
  isConfirmingAll = false,
}: BrunoProposalGroupProps) {
  const [isExpanded, setIsExpanded] = useState(proposals.length <= 3);

  const executableProposals = proposals.filter((p) => isV3ExecutableAction(p.type));
  const unexecutedCount = executableProposals.filter(
    (p) => actionStatuses[p.id] !== "success" && actionStatuses[p.id] !== "executing"
  ).length;

  const visibleProposals = isExpanded ? proposals : proposals.slice(0, 3);

  return (
    <div className="mt-3 flex flex-col gap-3">
      {visibleProposals.map((proposal) => (
        <BrunoActionProposalCard
          key={proposal.id}
          proposal={proposal}
          executionStatus={actionStatuses[proposal.id] ?? "idle"}
          executionError={actionErrors[proposal.id]}
          onConfirm={onConfirm}
          onCancel={onCancel}
          compact={true}
          disabled={isConfirmingAll}
        />
      ))}

      {proposals.length > 3 && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          disabled={isConfirmingAll}
          className="w-full rounded-xl border border-dashed border-[var(--color-settings-border)] px-4 py-2 text-xs font-medium text-[var(--color-settings-text-muted)] transition-colors hover:border-[var(--color-honey)]/40 hover:text-[var(--color-settings-text)] disabled:opacity-50"
        >
          + Show {proposals.length - 3} more
        </button>
      )}

      {unexecutedCount > 1 && onConfirmAll && (
        <button
          type="button"
          disabled={isConfirmingAll}
          onClick={() =>
            onConfirmAll(
              executableProposals.filter(
                (p) => actionStatuses[p.id] !== 'success' && actionStatuses[p.id] !== 'executing'
              )
            )
          }
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
            "bg-[var(--color-honey)]/15 text-[var(--color-honey)] hover:bg-[var(--color-honey)]/25"
          )}
        >
          {isConfirmingAll ? (
            <CircleNotch weight="bold" className="size-4 animate-spin" />
          ) : (
            <CheckSquareOffset weight="bold" className="size-4" />
          )}
          {isConfirmingAll ? 'Confirming…' : `Confirm All (${unexecutedCount})`}
        </button>
      )}
    </div>
  );
}
