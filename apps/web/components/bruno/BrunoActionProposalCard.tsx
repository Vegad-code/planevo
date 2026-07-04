"use client";

import type { BrunoActionProposal } from "@/lib/bruno/tools/types";
import {
  getProposalActionLabels,
  isV3ExecutableAction,
} from "@/lib/bruno/tools/actionLabels";
import { isValidProposalColor } from "@/lib/bruno/proposalColors";
import { cn } from "@/lib/utils";

export type ExecutionStatus = "idle" | "executing" | "success" | "error" | "cancelled";

export type BrunoActionProposalCardProps = {
  proposal: BrunoActionProposal;
  executionStatus?: ExecutionStatus;
  executionError?: string | null;
  onConfirm?: (proposal: BrunoActionProposal) => void | Promise<void>;
  onCancel?: (proposal: BrunoActionProposal) => void;
  compact?: boolean;
  disabled?: boolean;
};

export function BrunoActionProposalCard({
  proposal,
  executionStatus = "idle",
  executionError,
  onConfirm,
  onCancel,
  compact = false,
  disabled = false,
}: BrunoActionProposalCardProps) {
  const isExecutable = isV3ExecutableAction(proposal.type);
  const isConfirmableType = isExecutable;
  const canConfirm =
    isExecutable && isConfirmableType && executionStatus === "idle" && !disabled;

  const labels = getProposalActionLabels(proposal.type);

  const estimatedMinutes = proposal.payload?.estimatedMinutes
    ? Number(proposal.payload.estimatedMinutes)
    : undefined;
  const priority = proposal.payload?.priority as string | undefined;
  const startTimeLabel =
    typeof proposal.payload?.startTime === "string"
      ? proposal.payload.startTime
      : typeof proposal.payload?.start_time === "string"
        ? proposal.payload.start_time
        : null;
  const proposalColor =
    typeof proposal.payload?.color === "string" && isValidProposalColor(proposal.payload.color)
      ? proposal.payload.color
      : null;
  const colorCategory =
    typeof proposal.payload?.colorCategory === "string"
      ? proposal.payload.colorCategory
      : null;

  const successLabel = labels.successLabel;
  const errorLabel = labels.errorLabel;
  const confirmLabel = labels.confirmLabel;
  const executingLabel = labels.executingLabel;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]",
        compact ? "p-3" : "p-5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {proposalColor && (
            <span
              className="mt-1 size-3 shrink-0 rounded-full border border-[var(--color-settings-border)]"
              style={{ backgroundColor: proposalColor }}
              aria-hidden
            />
          )}
          <div className="min-w-0">
          <div className="font-semibold text-[var(--color-settings-text)]">{proposal.title}</div>
          <div className="mt-1 text-sm text-[var(--color-settings-text-muted)]">{proposal.description}</div>
          
          {compact && (estimatedMinutes || priority || startTimeLabel) && (
            <div className="mt-2 flex gap-2">
              {startTimeLabel && (
                <span className="rounded-full bg-[var(--color-settings-bg)] px-2 py-0.5 text-[10px] text-[var(--color-settings-text-muted)]">
                  {new Date(startTimeLabel).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {estimatedMinutes && (
                <span className="rounded-full bg-[var(--color-settings-bg)] px-2 py-0.5 text-[10px] text-[var(--color-settings-text-muted)]">
                  {estimatedMinutes}m
                </span>
              )}
              {priority && (
                <span className="rounded-full bg-[var(--color-settings-bg)] px-2 py-0.5 text-[10px] capitalize text-[var(--color-settings-text-muted)]">
                  {priority}
                </span>
              )}
              {colorCategory && (
                <span className="rounded-full bg-[var(--color-settings-bg)] px-2 py-0.5 text-[10px] capitalize text-[var(--color-settings-text-muted)]">
                  {colorCategory}
                </span>
              )}
            </div>
          )}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--color-sage)]/30 bg-[var(--color-sage)]/10 px-2 py-1 text-[10px] uppercase text-[var(--color-sage)]">
          {proposal.riskLevel} risk
        </span>
      </div>

      {executionStatus === "success" ? (
        <div className="mt-3 rounded-lg border border-[var(--color-sage)]/25 bg-[var(--color-sage)]/10 px-3 py-2 text-sm text-[var(--color-sage)]">
          {successLabel}
        </div>
      ) : null}

      {executionStatus === "error" ? (
        <div className="mt-3 rounded-lg border border-[var(--color-rose)]/25 bg-[var(--color-rose)]/10 px-3 py-2 text-sm text-[var(--color-rose)]">
          {executionError ?? errorLabel}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm?.(proposal)}
          className="rounded-lg bg-[var(--color-honey)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-honey)]/90 disabled:opacity-50"
        >
          {executionStatus === "executing"
            ? executingLabel
            : executionStatus === "success"
              ? "Executed"
              : isExecutable && isConfirmableType
                ? confirmLabel
                : isExecutable
                  ? "Confirm"
                  : "Coming soon"}
        </button>

        <button
          type="button"
          disabled={disabled && executionStatus !== "success"}
          onClick={() => onCancel?.(proposal)}
          className="rounded-lg bg-[var(--color-settings-bg)] px-3 py-2 text-sm text-[var(--color-settings-text-muted)] transition-colors hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)] disabled:opacity-50"
        >
          {executionStatus === "success" ? "Dismiss" : "Cancel"}
        </button>
      </div>

      {!compact && proposal.requiresConfirmation ? (
        <div className="mt-3 border-t border-[var(--color-settings-border)] pt-3 text-xs text-[var(--color-settings-text-muted)]">
          Requires your confirmation to execute.
        </div>
      ) : null}
    </div>
  );
}
