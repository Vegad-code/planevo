'use client';

import {
  CheckCircle,
  CircleNotch,
  Info,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useAppearance } from '@/components/providers/AppearanceProvider';

const toastSurfaceClass =
  'group toast flex w-full items-center gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-xl border-[var(--toast-border)] bg-[var(--toast-bg)] text-[var(--toast-text)] border-l-[3px] border-l-[var(--toast-brand)] group-[.toaster]:shadow-[var(--toast-shadow)]';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const { reduceMotion } = useAppearance();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      closeButton
      duration={4000}
      visibleToasts={reduceMotion ? 1 : 3}
      icons={{
        success: <CheckCircle size={18} weight="fill" className="text-[var(--toast-success)]" />,
        info: <Info size={18} weight="fill" className="text-[var(--toast-info)]" />,
        warning: <WarningCircle size={18} weight="fill" className="text-[var(--toast-info)]" />,
        error: <XCircle size={18} weight="fill" className="text-[var(--toast-error)]" />,
        loading: (
          <CircleNotch
            size={18}
            weight="bold"
            className="animate-spin text-[var(--toast-brand)]"
          />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: toastSurfaceClass,
          title: 'text-sm font-semibold text-[var(--toast-text)]',
          description: 'text-sm text-[var(--toast-text-muted)]',
          actionButton:
            'rounded-lg bg-[var(--toast-brand)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90',
          cancelButton:
            'rounded-lg bg-[var(--color-settings-card-hover)] px-3 py-1.5 text-xs font-medium text-[var(--toast-text-muted)] transition-colors hover:text-[var(--toast-text)]',
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
