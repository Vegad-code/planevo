'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowsClockwise } from '@phosphor-icons/react';
import { getNoteAccent } from '@planevo/notes-core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { noteAccentClass } from '@/lib/notes/ui';

type Flashcard = {
  id: string;
  front: string;
  back: string;
  note_id: string;
  notes?: { id: string; title: string } | null;
};

export function FlashcardsReview() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/flashcards?due=true');
    const data = await response.json();
    if (response.ok) {
      setCards(data.flashcards ?? []);
      setIndex(0);
      setRevealed(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = cards[index];
  const accent = current
    ? getNoteAccent(current.note_id, { noteKind: 'study_guide' })
    : 'cream';

  const review = async (quality: number) => {
    if (!current) return;
    await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review', flashcardId: current.id, quality }),
    });
    setRevealed(false);
    if (index + 1 >= cards.length) {
      toast.success('Review session complete');
      void load();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/notes"
          className="text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-serif text-3xl text-(--color-ink)">Flashcards</h1>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto flex items-center gap-1 text-sm text-(--color-ink-soft) hover:text-(--color-ink)"
        >
          <ArrowsClockwise size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="h-56 animate-pulse rounded-3xl bg-note-cream" />
      ) : !current ? (
        <div className="rounded-3xl bg-note-cream p-10 text-center">
          <p className="font-serif text-xl text-(--color-ink)">All caught up</p>
          <p className="mt-2 text-sm text-(--color-ink-soft)">
            No cards due. Make flashcards from your notes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-(--color-ink-faint)">
            Card {index + 1} of {cards.length}
            {current.notes?.title && ` · from ${current.notes.title}`}
          </p>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className={cn(
              'min-h-[220px] rounded-3xl p-6 text-left shadow-sm transition-all hover:shadow-md',
              noteAccentClass(accent)
            )}
          >
            <p className="font-serif text-2xl leading-snug text-(--color-ink)">{current.front}</p>
            {revealed && (
              <p className="mt-6 border-t border-(--color-line-strong) pt-4 text-(--color-ink-soft)">
                {current.back}
              </p>
            )}
            {!revealed && (
              <p className="mt-6 text-sm text-(--color-ink-faint)">Tap to reveal answer</p>
            )}
          </button>

          {revealed && (
            <div className="flex flex-wrap gap-2">
              <ReviewButton label="Again" quality={1} onReview={review} />
              <ReviewButton label="Hard" quality={3} onReview={review} />
              <ReviewButton label="Good" quality={4} onReview={review} variant="primary" />
              <ReviewButton label="Easy" quality={5} onReview={review} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewButton({
  label,
  quality,
  onReview,
  variant = 'default',
}: {
  label: string;
  quality: number;
  onReview: (q: number) => void;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      type="button"
      onClick={() => void onReview(quality)}
      className={cn(
        'flex-1 rounded-2xl py-2.5 text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-honey text-paper hover:bg-honey-deep'
          : 'border border-(--color-line-strong) bg-paper text-(--color-ink-soft) hover:bg-cream-2'
      )}
    >
      {label}
    </button>
  );
}
