'use client';

export default function NotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="rounded-3xl bg-note-coral/40 px-8 py-6">
        <p className="font-serif text-xl text-(--color-ink)">Couldn&apos;t load notes</p>
        <p className="mt-2 text-sm text-(--color-ink-soft)">
          {error.message || 'Something went wrong.'}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-honey px-5 py-2.5 text-sm font-semibold text-paper hover:bg-honey-deep"
      >
        Try again
      </button>
    </div>
  );
}
