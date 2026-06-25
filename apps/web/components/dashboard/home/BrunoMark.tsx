export function BrunoMark({
  size = 28,
  mood = 'normal',
}: {
  size?: number;
  mood?: string;
}) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="flex-none">
      <circle cx="14" cy="14" r="7" fill="var(--color-bruno-deep)" />
      <circle cx="34" cy="14" r="7" fill="var(--color-bruno-deep)" />
      <circle cx="14" cy="14" r="3.2" fill="var(--color-belly)" />
      <circle cx="34" cy="14" r="3.2" fill="var(--color-belly)" />
      <circle cx="24" cy="26" r="16" fill="var(--color-bruno)" />
      <ellipse cx="24" cy="30" rx="9" ry="7" fill="var(--color-belly)" />
      <circle cx="19" cy="23" r="1.7" fill="var(--color-ink)" />
      <circle cx="29" cy="23" r="1.7" fill="var(--color-ink)" />
      <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="var(--color-ink)" />
      {mood === 'happy' && (
        <path
          d="M 21 32 Q 24 34 27 32"
          stroke="var(--color-ink)"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
