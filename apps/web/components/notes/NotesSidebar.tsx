'use client';

import Link from 'next/link';
import {
  BookOpen,
  Cards,
  NotePencil,
  Plus,
  Sun,
  Tray,
} from '@phosphor-icons/react';
import { getNoteAccent } from '@planevo/notes-core';
import type { NoteTemplateDefinition } from '@planevo/notes-core';
import { cn } from '@/lib/utils';
import { noteAccentClass, type Notebook } from '@/lib/notes/ui';

function AccentDot({ kind, id }: { kind?: string; id: string }) {
  const accent = getNoteAccent(id, { notebookKind: kind });
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', noteAccentClass(accent))}
      aria-hidden
    />
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  href,
  dotKind,
  dotId,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  dotKind?: string;
  dotId?: string;
}) {
  const className = cn(
    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
    active
      ? 'bg-ink text-paper font-medium'
      : 'text-(--color-ink-soft) hover:bg-cream-2 hover:text-(--color-ink)'
  );

  const content = (
    <>
      {dotId ? <AccentDot kind={dotKind} id={dotId} /> : icon}
      {label}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function NotesSidebar({
  notebooks,
  selectedNotebookId,
  showTemplates,
  templates,
  onSelectNotebook,
  onQuickCapture,
  onDailyNote,
  onToggleTemplates,
  onTemplate,
}: {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  showTemplates: boolean;
  templates: NoteTemplateDefinition[];
  onSelectNotebook: (id: string | null) => void;
  onQuickCapture: () => void;
  onDailyNote: () => void;
  onToggleTemplates: () => void;
  onTemplate: (templateId: string) => void;
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-(--color-line) bg-paper/80 p-4 lg:w-56 lg:border-b-0 lg:border-r">
      <button
        type="button"
        onClick={onQuickCapture}
        className="mb-4 hidden items-center justify-center gap-2 rounded-full bg-honey px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-honey-deep lg:flex"
      >
        <Plus size={16} weight="bold" />
        Quick note
      </button>

      <nav className="flex flex-col gap-0.5">
        <SidebarItem
          icon={<Tray size={18} />}
          label="All notes"
          active={selectedNotebookId === null}
          onClick={() => onSelectNotebook(null)}
        />
        <SidebarItem
          icon={<Sun size={18} />}
          label="Today"
          onClick={onDailyNote}
        />
        <SidebarItem
          icon={<NotePencil size={18} />}
          label="Templates"
          active={showTemplates}
          onClick={onToggleTemplates}
        />
        <SidebarItem
          icon={<Cards size={18} />}
          label="Flashcards"
          href="/dashboard/notes/flashcards"
        />

        <p className="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-(--color-ink-faint)">
          Notebooks
        </p>
        {notebooks.map((nb) => (
          <SidebarItem
            key={nb.id}
            icon={<BookOpen size={18} />}
            label={nb.name}
            active={selectedNotebookId === nb.id}
            onClick={() => onSelectNotebook(nb.id)}
            dotKind={nb.kind}
            dotId={nb.id}
          />
        ))}
      </nav>

      {showTemplates && (
        <div className="mt-4 flex flex-col gap-1 rounded-2xl bg-cream p-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTemplate(t.id)}
              className="rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-paper"
            >
              <p className="font-medium text-(--color-ink)">{t.name}</p>
              <p className="text-xs text-(--color-ink-faint)">{t.description}</p>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
