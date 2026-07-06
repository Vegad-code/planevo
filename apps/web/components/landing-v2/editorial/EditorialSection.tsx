import { cn } from '@/lib/utils';

type EditorialTone = 'cream' | 'charcoal' | 'forest';

const toneStyles: Record<EditorialTone, string> = {
  cream: 'bg-[var(--color-paper)] text-[var(--color-ink)]',
  charcoal: 'bg-[var(--color-charcoal)] text-[var(--color-paper)]',
  forest: 'bg-[var(--color-forest-band)] text-[var(--color-paper)]',
};

interface EditorialSectionProps {
  tone?: EditorialTone;
  roundedTop?: boolean;
  bleed?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function EditorialSection({
  tone = 'cream',
  roundedTop = false,
  bleed = false,
  className,
  children,
  id,
}: EditorialSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        toneStyles[tone],
        roundedTop && 'rounded-t-[3rem] sm:rounded-t-[4rem]',
        bleed && 'relative left-1/2 right-1/2 -mx-[50vw] w-screen max-w-[100vw] px-0',
        className,
      )}
    >
      {children}
    </section>
  );
}
