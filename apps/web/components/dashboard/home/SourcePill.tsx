const KIND_DOT: Record<string, string> = {
  canvas: 'bg-(--color-rose)',
  cal: 'bg-(--color-blue)',
  task: 'bg-(--color-honey)',
  project: 'bg-(--color-sage)',
};

export function SourcePill({
  kind,
  label,
  count,
  status = 'synced',
}: {
  kind: 'canvas' | 'cal' | 'task' | 'project';
  label: string;
  count?: string;
  status?: string;
}) {
  const dot = KIND_DOT[kind] ?? KIND_DOT.task;
  return (
    <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-(--color-paper) border border-line-strong text-[13px] font-sans shadow-sm">
      <span className={`size-2 rounded-full ${dot}`} />
      <span className="text-(--color-ink) font-medium">{label}</span>
      {count && (
        <span className="font-mono text-[11px] text-(--color-ink-soft)">{count}</span>
      )}
      {status === 'synced' && (
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-(--color-cream-2) text-(--color-sage) tracking-wider">
          SYNCED
        </span>
      )}
    </div>
  );
}
