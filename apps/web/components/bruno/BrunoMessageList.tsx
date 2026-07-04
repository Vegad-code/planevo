'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PencilSimple } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { UIMessage } from 'ai';
import { brunoMarkdownComponents } from '@/components/bruno/brunoMarkdownComponents';
import { BrunoEntitlementNotice } from '@/components/bruno/BrunoEntitlementNotice';
import { BrunoIntegrationActionCard } from '@/components/bruno/BrunoIntegrationActionCard';
import { BrunoNoteActions } from '@/components/bruno/BrunoNoteActions';
import {
  BrunoMessageFooter,
  type BrunoMessageRating,
} from '@/components/bruno/BrunoMessageFooter';
import {
  BrunoEditVersionNav,
  type BrunoEditVersionNavProps,
} from '@/components/bruno/BrunoEditVersionNav';
import { BrunoVariantTurnSkeleton } from '@/components/bruno/BrunoVariantTurnSkeleton';
import { BrunoProposalGroup } from '@/components/bruno/BrunoProposalGroup';
import { BrunoThinkingIndicator } from '@/components/bruno/BrunoThinkingIndicator';
import type { BrunoThinkingPhaseVerb } from '@/lib/bruno/brunoThinkingPhrases';
import type { ExecutionStatus } from '@/components/bruno/BrunoActionProposalCard';
import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import type { BrunoDataParts } from '@/lib/bruno/types';
import {
  extractBrunoProposalsFromMessage,
  extractIntegrationToolCallsFromMessage,
} from '@/lib/bruno/proposalExtraction';

export type BrunoUIMessage = UIMessage<unknown, BrunoDataParts>;

export type BrunoMessageListProps = {
  messages: BrunoUIMessage[];
  /** Disables edit/copy affordances while a reply is generating. */
  isProcessing: boolean;
  /** Suppresses the empty-reply fallback and renders the thinking indicator. */
  isBrunoWorking: boolean;
  thinkingLabel?: {
    prefix: string;
    verbText: string;
    verb: BrunoThinkingPhaseVerb;
  } | null;
  editingMessageId?: string | null;
  onStartEditMessage?: (messageId: string, text: string) => void;
  conversationId: string | null;
  actionStatuses: Record<string, ExecutionStatus>;
  actionErrors: Record<string, string | null>;
  isConfirmingAll?: boolean;
  onConfirmProposal: (proposal: BrunoActionProposal) => void | Promise<void>;
  onCancelProposal: (proposal: BrunoActionProposal) => void;
  onConfirmAll?: (proposals: BrunoActionProposal[]) => void | Promise<void>;
  onContinueTruncated?: () => void;
  feedbackByMessageId?: Record<string, BrunoMessageRating>;
  onFeedback?: (messageId: string, rating: BrunoMessageRating) => void;
  onRegenerate?: (messageId: string) => void;
  variantInfoByMessageId?: Record<
    string,
    Pick<BrunoEditVersionNavProps, 'activeIndex' | 'totalVariants'> & {
      turnKey: string;
    }
  >;
  onSelectVariant?: (turnKey: string, variantIndex: number) => void;
  pendingVariantTurnKey?: string | null;
};

/**
 * Shared Bruno message stream renderer — one rendering path for the dashboard
 * sidebar and the floating widget, covering text, proposal cards (both the
 * agent-loop approval flow and legacy confirm), integration status cards,
 * entitlement notices, truncation notices, and stream errors.
 */
export function BrunoMessageList({
  messages,
  isProcessing,
  isBrunoWorking,
  thinkingLabel,
  editingMessageId,
  onStartEditMessage,
  conversationId,
  actionStatuses,
  actionErrors,
  isConfirmingAll = false,
  onConfirmProposal,
  onCancelProposal,
  onConfirmAll,
  onContinueTruncated,
  feedbackByMessageId = {},
  onFeedback,
  onRegenerate,
  variantInfoByMessageId = {},
  onSelectVariant,
  pendingVariantTurnKey = null,
}: BrunoMessageListProps) {
  function turnKeyForMessageIndex(index: number): string | undefined {
    const message = messages[index];
    if (!message) return undefined;
    if (message.role === 'user') {
      return variantInfoByMessageId[message.id]?.turnKey;
    }
    for (let j = index - 1; j >= 0; j--) {
      const prior = messages[j];
      if (prior.role === 'user') {
        return variantInfoByMessageId[prior.id]?.turnKey;
      }
    }
    return undefined;
  }

  return (
    <AnimatePresence initial={false}>
      {messages.map((message, i) => {
        const textPart =
          message.parts?.find((p) => p.type === 'text')?.text || '';
        const entitlementParts =
          message.parts?.filter(
            (part) =>
              part.type === 'data-bruno-upgrade-card' ||
              part.type === 'data-bruno-pro-warning' ||
              part.type === 'data-bruno-pro-cap'
          ) || [];
        const clarificationParts =
          message.parts?.filter(
            (part) => part.type === 'data-bruno-clarification-card'
          ) || [];
        const truncatedPart = message.parts?.find(
          (part) => part.type === 'data-bruno-truncated'
        );
        const truncatedNotice =
          truncatedPart?.type === 'data-bruno-truncated'
            ? truncatedPart.data
            : null;
        const streamErrorPart = message.parts?.find(
          (part) => part.type === 'data-bruno-stream-error'
        );
        const streamErrorNotice =
          streamErrorPart?.type === 'data-bruno-stream-error'
            ? streamErrorPart.data
            : null;
        const isEditing = editingMessageId === message.id;
        const messageTurnKey = turnKeyForMessageIndex(i);
        const showVariantSkeleton =
          Boolean(pendingVariantTurnKey) &&
          messageTurnKey === pendingVariantTurnKey;

        const proposals = extractBrunoProposalsFromMessage(message);
        const hasProposals = proposals.length > 0;
        const integrationCalls = extractIntegrationToolCallsFromMessage(message);

        // Merge loop-derived states over the legacy client-side status map.
        const mergedStatuses: Record<string, ExecutionStatus> = {
          ...actionStatuses,
        };
        const mergedErrors: Record<string, string | null> = { ...actionErrors };
        for (const proposal of proposals) {
          if (proposal.derivedStatus && proposal.derivedStatus !== 'idle') {
            mergedStatuses[proposal.id] = proposal.derivedStatus;
          }
          if (proposal.derivedError) {
            mergedErrors[proposal.id] = proposal.derivedError;
          }
        }

        const hasVisibleAssistantContent =
          Boolean(textPart) ||
          hasProposals ||
          integrationCalls.length > 0 ||
          entitlementParts.length > 0 ||
          clarificationParts.length > 0 ||
          Boolean(truncatedNotice) ||
          Boolean(streamErrorNotice);

        const isLastMessage = i === messages.length - 1;
        const showEmptyReplyFallback =
          message.role === 'assistant' &&
          !hasVisibleAssistantContent &&
          isLastMessage &&
          !isBrunoWorking;

        if (
          message.role === 'assistant' &&
          !hasVisibleAssistantContent &&
          !showEmptyReplyFallback
        ) {
          return null;
        }

        const showFooter =
          message.role === 'assistant' &&
          hasVisibleAssistantContent &&
          !(isLastMessage && isBrunoWorking);

        return (
          <motion.div
            key={message.id || i}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className={`relative z-10 flex gap-2 ${
              message.role === 'user'
                ? 'items-end justify-end group'
                : 'flex-col items-start justify-start'
            }`}
          >
            {message.role === 'assistant' &&
              entitlementParts.map((part, partIndex) =>
                'data' in part ? (
                  <BrunoEntitlementNotice
                    key={`${part.type}-${partIndex}`}
                    notice={part.data}
                  />
                ) : null
              )}
            {message.role === 'user' ? (
              <div className="relative ml-auto">
                {!isProcessing && !isEditing && onStartEditMessage && (
                  <button
                    onClick={() => onStartEditMessage(message.id, textPart)}
                    className="absolute top-1/2 -translate-y-1/2 right-[100%] mr-2 p-1.5 rounded-full text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)] transition-all opacity-0 group-hover:opacity-100"
                    title="Edit message"
                  >
                    <PencilSimple size={14} />
                  </button>
                )}
                <div
                  className={`max-w-[min(82vw,34rem)] rounded-2xl border border-[var(--color-settings-brand)]/20 bg-[var(--color-settings-brand)]/18 px-4 py-2.5 text-[15px] leading-6 text-[var(--color-settings-text)] ${isEditing ? 'opacity-50' : ''}`}
                >
                  {showVariantSkeleton ? (
                    <BrunoVariantTurnSkeleton role="user" className="border-0 bg-transparent px-0 py-0" />
                  ) : (
                    <p>{textPart}</p>
                  )}
                </div>
                {variantInfoByMessageId[message.id] && onSelectVariant ? (
                  <BrunoEditVersionNav
                    activeIndex={variantInfoByMessageId[message.id].activeIndex}
                    totalVariants={
                      variantInfoByMessageId[message.id].totalVariants
                    }
                    disabled={isProcessing}
                    onSelect={(index) =>
                      onSelectVariant(
                        variantInfoByMessageId[message.id].turnKey,
                        index
                      )
                    }
                  />
                ) : null}
              </div>
            ) : (
              <div className="group relative mr-auto w-full max-w-[min(92%,48rem)]">
                {showVariantSkeleton ? (
                  <BrunoVariantTurnSkeleton role="assistant" />
                ) : (
                <div className="rounded-2xl border border-[var(--color-settings-border)]/60 bg-[var(--color-settings-card)]/30 px-4 py-3 text-[15px] leading-7 text-[var(--color-settings-text)] md:px-5">
                  <div className="w-full">
                    <div className="bruno-markdown max-w-none text-[15px] text-[var(--color-settings-text)]">
                      {integrationCalls.map((call) => (
                        <BrunoIntegrationActionCard
                          key={call.key}
                          toolName={call.toolName}
                          status={call.status}
                          url={call.url}
                          errorText={call.errorText}
                        />
                      ))}
                      {textPart ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeSanitize]}
                          components={brunoMarkdownComponents}
                        >
                          {textPart}
                        </ReactMarkdown>
                      ) : showEmptyReplyFallback ? (
                        <p className="text-[var(--color-settings-text-muted)]">
                          Bruno finished but didn&apos;t return a visible
                          reply. Try sending your request again or be more
                          specific.
                        </p>
                      ) : null}
                      {streamErrorNotice ? (
                        <div className="mt-3 rounded-lg border border-[var(--color-rose)]/25 bg-[var(--color-rose)]/10 px-3 py-2 text-sm text-[var(--color-rose)]">
                          {streamErrorNotice.message}
                        </div>
                      ) : null}
                    </div>
                    {hasProposals && (
                      <div className="mt-3">
                        <BrunoProposalGroup
                          proposals={proposals}
                          actionStatuses={mergedStatuses}
                          actionErrors={mergedErrors}
                          onConfirm={onConfirmProposal}
                          onCancel={onCancelProposal}
                          onConfirmAll={onConfirmAll}
                          isConfirmingAll={isConfirmingAll}
                        />
                      </div>
                    )}
                    {clarificationParts.length === 0 && (
                      <BrunoNoteActions
                        content={truncatedNotice?.assistantText || textPart}
                        conversationId={conversationId}
                        truncated={truncatedNotice}
                        onContinue={() => onContinueTruncated?.()}
                      />
                    )}
                  </div>
                </div>
                )}
                {!showVariantSkeleton && showFooter && (
                  <BrunoMessageFooter
                    messageId={message.id}
                    text={truncatedNotice?.assistantText || textPart}
                    rating={feedbackByMessageId[message.id] ?? null}
                    showRegenerate={Boolean(onRegenerate)}
                    disabled={isProcessing}
                    onRegenerate={
                      onRegenerate ? () => onRegenerate(message.id) : undefined
                    }
                    onFeedback={
                      onFeedback
                        ? (rating) => onFeedback(message.id, rating)
                        : undefined
                    }
                  />
                )}
              </div>
            )}
          </motion.div>
        );
      })}
      {isBrunoWorking && thinkingLabel && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="relative z-10"
        >
          <BrunoThinkingIndicator
            prefix={thinkingLabel.prefix}
            verbText={thinkingLabel.verbText}
            verb={thinkingLabel.verb}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
