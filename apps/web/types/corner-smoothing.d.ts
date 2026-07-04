declare module 'corner-smoothing' {
  import type {
    ComponentType,
    DetailedHTMLProps,
    ForwardRefExoticComponent,
    HTMLAttributes,
    ReactHTML,
    ReactNode,
    RefAttributes,
  } from 'react';

  export interface SquircleOptions {
    cornerRadius?: number;
    topLeftCornerRadius?: number;
    topRightCornerRadius?: number;
    bottomRightCornerRadius?: number;
    bottomLeftCornerRadius?: number;
    cornerSmoothing?: number;
    preserveSmoothing?: boolean;
    borderWidth?: number;
  }

  type SquircleProps = {
    children: ReactNode;
    as?: keyof ReactHTML | ComponentType<unknown>;
  } & SquircleOptions &
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

  export const Squircle: ForwardRefExoticComponent<
    Omit<SquircleProps, 'ref'> & RefAttributes<unknown>
  >;

  export function squircle<P>(
    Component: keyof ReactHTML | ComponentType<P>,
    opts: SquircleOptions,
  ): ForwardRefExoticComponent<P & RefAttributes<unknown>>;
}
