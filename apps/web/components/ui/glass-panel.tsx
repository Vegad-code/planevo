import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassPanelVariants = cva('transition-colors duration-200', {
  variants: {
    variant: {
      chrome: 'glass-panel rounded-3xl',
      card: 'glass-card rounded-2xl',
      pill: 'glass-panel rounded-full',
      flat: 'rounded-2xl border border-[var(--glass-border)] bg-[var(--color-surface-raised)]',
    },
    interactive: {
      true: 'hover:border-[var(--color-accent-warm)]/30 cursor-pointer',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'card',
    interactive: false,
  },
});

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanelVariants> {
  as?: 'div' | 'section' | 'aside' | 'nav';
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant, interactive, as: Component = 'div', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(glassPanelVariants({ variant, interactive }), className)}
      {...props}
    />
  ),
);
GlassPanel.displayName = 'GlassPanel';

export { GlassPanel, glassPanelVariants };
