import { BrainCircuit } from 'lucide-react';

interface BrunoBrainIconProps {
  size?: number;
  className?: string;
  weight?: string;
}

/** Lucide BrainCircuit — half brain, half circuit board (AI companion). */
export function BrunoBrainIcon({ size = 18, className }: BrunoBrainIconProps) {
  return (
    <BrainCircuit
      size={size}
      strokeWidth={1.75}
      className={className}
      aria-hidden
    />
  );
}
