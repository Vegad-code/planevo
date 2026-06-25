'use client';

import Link from 'next/link';
import { MagnifyingGlass } from '@phosphor-icons/react';

export function NotesPageHeader({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-(--color-line) px-4 py-5 lg:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-tight text-(--color-ink) md:text-5xl">
            Notes
          </h1>
          <p className="mt-1 text-sm text-(--color-ink-soft)">
            Your <span className="font-serif italic text-(--color-honey-deep)">study space</span>
          </p>
        </div>
        <Link
          href="/dashboard/chat"
          className="inline-flex w-fit items-center rounded-full border border-(--color-line-strong) bg-paper px-4 py-2 text-sm font-medium text-(--color-ink) transition-colors hover:bg-cream-2"
        >
          Ask Bruno
        </Link>
      </div>

      <div className="relative max-w-xl">
        <MagnifyingGlass
          size={18}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-(--color-ink-faint)"
        />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search notes…"
          className="w-full rounded-full border border-(--color-line-strong) bg-paper py-2.5 pr-4 pl-10 text-sm text-(--color-ink) outline-none transition-shadow focus:border-(--color-honey) focus:ring-2 focus:ring-(--color-honey-soft)"
        />
      </div>
    </header>
  );
}
