'use client';

import { CircleNotch } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useAppearance } from '@/components/providers/AppearanceProvider';

const toastSurfaceClass =
  'group toast flex w-full items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl border-[var(--toast-border)] bg-[var(--toast-bg)] text-[var(--toast-text)] group-[.toaster]:shadow-[var(--toast-shadow)]';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const { reduceMotion } = useAppearance();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      closeButton
      duration={4500}
      gap={10}
      offset={20}
      visibleToasts={reduceMotion ? 1 : 3}
      icons={{
        loading: (
          <CircleNotch
            size={16}
            weight="bold"
            className="animate-spin text-[var(--toast-brand)]"
          />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: toastSurfaceClass,
          title: 'text-[0.8125rem] font-medium leading-snug tracking-tight text-[var(--toast-text)]',
          description: 'text-xs leading-relaxed text-[var(--toast-text-muted)]',
          actionButton:
            'shrink-0 rounded-lg border border-[var(--toast-border)] bg-[var(--color-settings-card-hover)] px-3 py-1.5 text-xs font-medium text-[var(--toast-text)] transition-colors hover:border-[color-mix(in_srgb,var(--toast-accent)_40%,var(--toast-border))] hover:bg-[color-mix(in_srgb,var(--toast-accent)_8%,var(--color-settings-card-hover))]',
          cancelButton:
            'rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--toast-text-muted)] transition-colors hover:text-[var(--toast-text)]',
          closeButton:
            'rounded-full border border-[var(--toast-border)] bg-[var(--color-settings-card-hover)] text-[var(--toast-text-muted)] transition-colors hover:text-[var(--toast-text)]',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--toast-bg)',
          '--normal-text': 'var(--toast-text)',
          '--normal-border': 'var(--toast-border)',
          '--border-radius': 'var(--toast-radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
