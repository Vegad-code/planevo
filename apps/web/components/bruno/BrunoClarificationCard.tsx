'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  PencilSimple,
  Sparkle,
} from '@phosphor-icons/react';
import type {
  BrunoClarificationAnswer,
  BrunoClarificationCard as BrunoClarificationCardData,
  BrunoClarificationResponse,
} from '@/lib/bruno/types';
import { cn } from '@/lib/utils';

type AnswerDraft = {
  answer: string;
  source: BrunoClarificationAnswer['source'];
};

type BrunoClarificationCardProps = {
  card: BrunoClarificationCardData;
  disabled?: boolean;
  variant?: 'inline' | 'composer';
  onSubmit: (response: BrunoClarificationResponse) => void;
};

export function BrunoClarificationCard({
  card,
  disabled = false,
  variant = 'inline',
  onSubmit,
}: BrunoClarificationCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = card.questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const currentOtherText = otherText[currentQuestion.id] ?? '';
  const isLastQuestion = currentIndex === card.questions.length - 1;
  const isLocked = disabled || submitted;
  const canContinue =
    isLocked ||
    Boolean(
      currentAnswer?.source === 'option' ||
        (currentAnswer?.source === 'other' && currentOtherText.trim())
    );

  const progressLabel = useMemo(
    () => `${currentIndex + 1} of ${card.questions.length}`,
    [card.questions.length, currentIndex]
  );
  const isComposer = variant === 'composer';

  const buildResponse = (
    sourceOverride?: BrunoClarificationAnswer['source']
  ): BrunoClarificationResponse => ({
    cardId: card.id,
    originalPrompt: card.originalPrompt,
    answers: card.questions.map((question) => {
      const saved = answers[question.id];
      const skip = sourceOverride === 'skip';
      return {
        questionId: question.id,
        question: question.question,
        answer: skip
          ? 'Answer with reasonable assumptions.'
          : saved?.source === 'other'
            ? (otherText[question.id] ?? '').trim()
            : saved?.answer ?? 'Answer with reasonable assumptions.',
        source: skip ? 'skip' : saved?.source ?? 'skip',
      };
    }),
  });

  const submit = () => {
    if (isLocked) return;
    setSubmitted(true);
    onSubmit(buildResponse());
  };

  const skip = () => {
    if (isLocked) return;
    setSubmitted(true);
    onSubmit(buildResponse('skip'));
  };

  const continueOrSubmit = () => {
    if (!canContinue || isLocked) return;
    if (isLastQuestion) {
      submit();
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  return (
    <section
      aria-label="Bruno clarification questions"
      className={cn(
        'w-full overflow-hidden border backdrop-blur-2xl',
        isComposer
          ? 'rounded-[1.75rem] border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/92 p-3 shadow-[0_18px_60px_-36px_rgba(0,0,0,0.38),0_8px_24px_-18px_rgba(0,0,0,0.2)] md:p-4'
          : 'max-w-[44rem] rounded-3xl border-[var(--glass-border)] bg-[var(--glass-card-bg)] p-4 shadow-[var(--glass-shadow)] md:p-5'
      )}
    >
      <div className={cn('flex items-start justify-between gap-3', isComposer ? 'mb-3' : 'mb-4')}>
        <div className="min-w-0">
          <div
            className={cn(
              'mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--color-settings-border)] bg-[var(--color-settings-bg)]/70 text-[11px] font-semibold text-[var(--color-settings-text-muted)]',
              isComposer ? 'px-2.5 py-1' : 'px-3 py-1'
            )}
          >
            <Sparkle weight="fill" className="h-3.5 w-3.5 text-[var(--color-settings-brand)]" />
            Clarify first
          </div>
          <h4
            className={cn(
              'text-[var(--color-settings-text)]',
              isComposer
                ? 'text-[15px] font-semibold leading-6'
                : 'font-serif text-lg leading-6'
            )}
          >
            {currentQuestion.question}
          </h4>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-settings-card-hover)] px-2.5 py-1 text-xs font-semibold text-[var(--color-settings-text-muted)]">
          {progressLabel}
        </span>
      </div>

      <div className="grid gap-2">
        {currentQuestion.options.map((option, index) => {
          const selected =
            currentAnswer?.source === 'option' &&
            currentAnswer.answer === option.label;
          return (
            <button
              key={option.id}
              type="button"
              aria-label={option.label}
              disabled={isLocked}
              onClick={() =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: {
                    answer: option.label,
                    source: 'option',
                  },
                }))
              }
              className={cn(
                'group flex w-full items-start rounded-2xl border text-left transition-all',
                isComposer ? 'gap-2.5 px-3 py-2.5' : 'gap-3 px-3.5 py-3',
                selected
                  ? 'border-[var(--color-settings-brand)] bg-[var(--color-settings-brand)]/14 text-[var(--color-settings-text)]'
                  : 'border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/55 text-[var(--color-settings-text)] hover:border-[var(--color-settings-brand)]/35 hover:bg-[var(--color-settings-card-hover)]/80',
                isLocked && 'cursor-default opacity-70'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isComposer ? 'h-5 w-5' : 'h-6 w-6',
                  selected
                    ? 'bg-[var(--color-settings-brand)] text-white'
                    : 'bg-[var(--color-settings-bg)] text-[var(--color-settings-text-muted)]'
                )}
              >
                {selected ? <Check weight="bold" className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--color-settings-text-muted)]">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}

        {currentAnswer?.source === 'other' ? (
          <label
            className={cn(
              'rounded-2xl border border-[var(--color-settings-brand)] bg-[var(--color-settings-brand)]/10 transition-all',
              isComposer ? 'px-3 py-2.5' : 'px-3.5 py-3',
              isLocked && 'opacity-70'
            )}
          >
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-settings-text)]">
              <PencilSimple weight="bold" className="h-4 w-4 text-[var(--color-settings-brand)]" />
              Other
            </span>
            <textarea
              disabled={isLocked}
              value={currentOtherText}
              onFocus={() =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: {
                    answer: currentOtherText,
                    source: 'other',
                  },
                }))
              }
              onChange={(event) => {
                const value = event.target.value;
                setOtherText((prev) => ({
                  ...prev,
                  [currentQuestion.id]: value,
                }));
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: {
                    answer: value,
                    source: 'other',
                  },
                }));
              }}
              rows={isComposer ? 1 : 2}
              autoFocus
              placeholder="Type your own answer..."
              className="w-full resize-none rounded-xl border border-[var(--color-settings-border)] bg-[var(--color-settings-bg)]/70 px-3 py-2 text-sm text-[var(--color-settings-text)] outline-none transition-colors placeholder:text-[var(--color-settings-text-muted)] focus:border-[var(--color-settings-brand)]"
            />
          </label>
        ) : (
          <button
            type="button"
            aria-label="Other"
            disabled={isLocked}
            onClick={() =>
              setAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: {
                  answer: currentOtherText,
                  source: 'other',
                },
              }))
            }
            className={cn(
              'flex w-full items-center gap-2 rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/45 text-left text-sm font-semibold text-[var(--color-settings-text)] transition-all hover:border-[var(--color-settings-brand)]/35 hover:bg-[var(--color-settings-card-hover)]/80',
              isComposer ? 'px-3 py-2.5' : 'px-3.5 py-3',
              isLocked && 'cursor-default opacity-70'
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-settings-bg)] text-[var(--color-settings-brand)]">
              <PencilSimple weight="bold" className="h-3.5 w-3.5" />
            </span>
            Other
          </button>
        )}
      </div>

      <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', isComposer ? 'mt-3' : 'mt-4')}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentIndex === 0 || isLocked}
            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-settings-border)] px-3 py-2 text-xs font-semibold text-[var(--color-settings-text-muted)] transition-colors hover:bg-[var(--color-settings-card-hover)] disabled:cursor-default disabled:opacity-40"
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={skip}
            className="rounded-full px-3 py-2 text-xs font-semibold text-[var(--color-settings-text-muted)] transition-colors hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)] disabled:cursor-default disabled:opacity-40"
          >
            Answer with assumptions
          </button>
        </div>

        <button
          type="button"
          disabled={!canContinue || isLocked}
          onClick={continueOrSubmit}
          className="rounded-full bg-[var(--color-settings-brand)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45"
        >
          {submitted
            ? 'Sent'
            : isLastQuestion
              ? 'Send context'
              : 'Next question'}
        </button>
      </div>
    </section>
  );
}
