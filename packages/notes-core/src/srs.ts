import type { FlashcardReviewResult } from './types';

/** Simplified SM-2 spaced repetition */
export function reviewFlashcard(
  quality: number,
  currentInterval: number,
  currentEase: number
): FlashcardReviewResult {
  let ease = currentEase;
  let interval = currentInterval;

  if (quality >= 3) {
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * ease);
    }
    ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { interval, ease, nextReviewAt };
}

export function defaultFlashcardSrs() {
  return { interval: 0, ease: 2.5 };
}
