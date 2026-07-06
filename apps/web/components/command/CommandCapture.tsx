'use client';

import { useEffect, useRef, useState } from 'react';
import { Microphone, ArrowRight } from '@phosphor-icons/react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { FEATURES } from '@/lib/featureFlags';
import { CommandVoiceButton } from './CommandVoiceButton';
import type { ExtractedResponsibility } from '@/lib/command/types';

const ROTATING_PLACEHOLDERS = [
  'Type, paste, or say everything you have going on.',
  'I have a chem test Friday, practice at 4, and a club meeting…',
  'Paste a Slack message, class reminder, or messy note…',
];

/**
 * The capture band — the one typeable surface on the page (§26.1). It reads as a
 * notepad, NOT a chatbot: no chat bubble, no send-arrow-in-a-pill framing, no
 * "Ask AI anything". A glass plane is allowed here (it is a genuinely separate
 * surface). When the board is populated it collapses to a single-line bar; when
 * empty it is large and dominant.
 */
export function CommandCapture({
  variant,
  submitting,
  onSubmit,
  onVoicePreview,
  onVoiceError,
  scriptedText,
}: {
  variant: 'hero' | 'bar';
  submitting: boolean;
  onSubmit: (text: string) => void;
  onVoicePreview?: (
    intakeRunId: string,
    summary: string,
    previewItems: ExtractedResponsibility[],
  ) => void;
  onVoiceError?: (message: string) => void;
  /** Marketing-demo mode: renders this text read-only (typewriter driven by the caller). */
  scriptedText?: string;
}) {
  const [text, setText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate the placeholder subtly on the hero variant only.
  useEffect(() => {
    if (variant !== 'hero') return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [variant]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
    setText('');
  }

  const isHero = variant === 'hero';
  const isScripted = scriptedText !== undefined;
  const displayText = isScripted ? scriptedText : text;

  return (
    <GlassPanel
      variant="card"
      className={[
        'w-full',
        isHero ? 'p-4 sm:p-5' : 'px-3 py-2.5',
      ].join(' ')}
    >
      <div className={isHero ? 'flex flex-col gap-3' : 'flex items-center gap-2'}>
        <textarea
          ref={textareaRef}
          value={displayText}
          readOnly={isScripted}
          onChange={(e) => {
            if (!isScripted) setText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={isHero ? 3 : 1}
          placeholder={
            isHero ? ROTATING_PLACEHOLDERS[placeholderIndex] : ROTATING_PLACEHOLDERS[0]
          }
          className={[
            'w-full resize-none bg-transparent text-[var(--color-ink)] outline-none',
            'placeholder:text-[var(--color-ink-faint)]',
            isHero ? 'text-[16px] leading-relaxed min-h-[76px]' : 'text-[14px] leading-6',
          ].join(' ')}
        />

        <div className={isHero ? 'flex items-center justify-between' : 'flex items-center gap-1.5'}>
          {FEATURES.COMMAND_VOICE && onVoicePreview ? (
            <CommandVoiceButton onVoicePreview={onVoicePreview} onError={onVoiceError} />
          ) : (
            <button
              type="button"
              aria-label="Capture by voice"
              disabled
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[var(--color-ink-faint)] opacity-50"
            >
              <Microphone weight="regular" size={18} />
            </button>
          )}

          <button
            type="button"
            data-demo-target="clear-my-plate"
            onClick={submit}
            disabled={submitting || displayText.trim().length === 0}
            className={[
              'flex items-center gap-1.5 rounded-full font-medium transition-all duration-150',
              'bg-[var(--color-accent-warm)] text-white disabled:opacity-40',
              isHero ? 'px-4 py-2 text-[14px]' : 'h-9 w-9 justify-center p-0',
            ].join(' ')}
          >
            {isHero ? (
              <span>{submitting ? 'Sorting…' : 'Clear My Plate'}</span>
            ) : (
              <ArrowRight weight="bold" size={16} />
            )}
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
