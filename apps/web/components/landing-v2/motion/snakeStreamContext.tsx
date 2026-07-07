'use client';

import { createContext, useContext } from 'react';
import type { MotionValue } from 'framer-motion';

const SnakeStreamProgressContext = createContext<MotionValue<number> | null>(null);

export function SnakeStreamProgressProvider({
  progress,
  children,
}: {
  progress: MotionValue<number>;
  children: React.ReactNode;
}) {
  return (
    <SnakeStreamProgressContext.Provider value={progress}>
      {children}
    </SnakeStreamProgressContext.Provider>
  );
}

export function useSnakeStreamProgress(): MotionValue<number> | null {
  return useContext(SnakeStreamProgressContext);
}
