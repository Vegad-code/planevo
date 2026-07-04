'use client';

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { Squircle } from 'corner-smoothing';
import { cn } from '@/lib/utils';

type SmoothSurfaceProps<T extends ElementType = 'div'> = {
  as?: T;
  children: ReactNode;
  className?: string;
  cornerRadius?: number;
  cornerSmoothing?: number;
  borderWidth?: number;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function SmoothSurface<T extends ElementType = 'div'>({
  as,
  children,
  className,
  cornerRadius = 26,
  cornerSmoothing = 0.86,
  borderWidth,
  ...props
}: SmoothSurfaceProps<T>) {
  return (
    <Squircle
      as={as ?? 'div'}
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      borderWidth={borderWidth}
      className={cn('overflow-hidden rounded-[26px]', className)}
      {...props}
    >
      {children}
    </Squircle>
  );
}
