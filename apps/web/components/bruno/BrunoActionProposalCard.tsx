"use client";

import type { BrunoActionProposal } from "@/lib/bruno/tools/types";
import { getActionDefinition } from "@/lib/bruno/tools/registry";

export type ExecutionStatus = "idle" | "executing" | "success" | "error" | "cancelled";

export type BrunoActionProposalCardProps = {
  proposal: BrunoActionProposal;
  executionStatus?: ExecutionStatus;
  executionError?: string | null;
  onConfirm?: (proposal: BrunoActionProposal) => void | Promise<void>;
  onCancel?: (proposal: BrunoActionProposal) => void;
  compact?: boolean;
};

export function BrunoActionProposalCard({
  proposal,
  executionStatus = "idle",
  executionError,
  onConfirm,
  onCancel,
  compact = false,
}: BrunoActionProposalCardProps) {
  const actionDef = getActionDefinition(proposal.type);
  const isExecutable = actionDef?.executable ?? false;
  const canConfirm = isExecutable && proposal.type === "CREATE_TASK" && executionStatus === "idle";

  const estimatedMinutes = proposal.payload?.estimatedMinutes ? Number(proposal.payload.estimatedMinutes) : undefined;
  const priority = proposal.payload?.priority as string | undefined;

  return (
    <div className={compact ? "rounded-xl border border-white/10 p-3 bg-[#111113]" : "rounded-2xl border border-white/10 p-5 bg-[#111113]"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{proposal.title}</div>
          <div className="mt-1 text-sm text-white/60">{proposal.description}</div>
          
          {compact && (estimatedMinutes || priority) && (
            <div className="mt-2 flex gap-2">
              {estimatedMinutes && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                  {estimatedMinutes}m
                </span>
              )}
              {priority && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50 capitalize">
                  {priority}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase text-emerald-400">
          {proposal.riskLevel} risk
        </span>
      </div>

      {executionStatus === "success" ? (
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Task created
        </div>
      ) : null}

      {executionStatus === "error" ? (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {executionError ?? "Couldn't create task. Try again."}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm?.(proposal)}
          className="rounded-lg bg-[#d99043] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:bg-[#c48139]"
        >
          {executionStatus === "executing"
            ? "Creating..."
            : executionStatus === "success"
              ? "Executed"
              : isExecutable
                ? "Confirm"
                : "Coming soon"}
        </button>

        <button
          type="button"
          onClick={() => onCancel?.(proposal)}
          className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.1]"
        >
          {executionStatus === "success" ? "Dismiss" : "Cancel"}
        </button>
      </div>

      {!compact && proposal.requiresConfirmation ? (
        <div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/50">
          Requires your confirmation to execute.
        </div>
      ) : null}
    </div>
  );
}
