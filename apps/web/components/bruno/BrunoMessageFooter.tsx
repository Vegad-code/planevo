'use client';

import { useState, type ReactNode } from 'react';
import {
  ArrowClockwise,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ShareNetwork,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type BrunoMessageRating = 1 | -1;

export interface BrunoMessageFooterProps {
  messageId: string;
  text: string;
  rating?: BrunoMessageRating | null;
  showRegenerate?: boolean;
  disabled?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (rating: BrunoMessageRating) => void;
}

function FooterIconButton({
  label,
  pressed,
  onClick,
  disabled,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'p-1.5 rounded-md text-[var(--color-settings-text-muted)] transition-colors',
        'hover:text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        pressed && 'text-[var(--color-settings-brand)] bg-[var(--color-settings-brand)]/10'
      )}
    >
      {children}
    </button>
  );
}

export function BrunoMessageFooter({
  text,
  rating = null,
  showRegenerate = true,
  disabled = false,
  onRegenerate,
  onFeedback,
}: BrunoMessageFooterProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleShare = async () => {
    if (!text) return;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard (share not available)');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast.error('Could not share message');
    }
  };

  return (
    <div className="flex items-center gap-0.5 pt-1.5 mt-1">
      {showRegenerate && onRegenerate && (
        <FooterIconButton
          label="Regenerate response"
          onClick={onRegenerate}
          disabled={disabled}
        >
          <ArrowClockwise size={16} />
        </FooterIconButton>
      )}
      {onFeedback && (
        <>
          <FooterIconButton
            label="Good response"
            pressed={rating === 1}
            onClick={() => onFeedback(1)}
            disabled={disabled}
          >
            <ThumbsUp size={16} weight={rating === 1 ? 'fill' : 'regular'} />
          </FooterIconButton>
          <FooterIconButton
            label="Bad response"
            pressed={rating === -1}
            onClick={() => onFeedback(-1)}
            disabled={disabled}
          >
            <ThumbsDown size={16} weight={rating === -1 ? 'fill' : 'regular'} />
          </FooterIconButton>
        </>
      )}
      <FooterIconButton
        label={copied ? 'Copied' : 'Copy'}
        onClick={() => void handleCopy()}
        disabled={disabled || !text}
      >
        <Copy size={16} />
      </FooterIconButton>
      <FooterIconButton
        label="Share"
        onClick={() => void handleShare()}
        disabled={disabled || !text}
      >
        <ShareNetwork size={16} />
      </FooterIconButton>
    </div>
  );
}
