'use client';

import { createContext, useContext } from 'react';

interface BrunoSkillLaunchContextValue {
  userBubbleLayoutId?: string;
  showLayoutMorph: boolean;
}

const BrunoSkillLaunchContext = createContext<BrunoSkillLaunchContextValue>({
  showLayoutMorph: false,
});

export function BrunoSkillLaunchProvider({
  children,
  userBubbleLayoutId,
  showLayoutMorph,
}: {
  children: React.ReactNode;
  userBubbleLayoutId?: string;
  showLayoutMorph: boolean;
}) {
  return (
    <BrunoSkillLaunchContext.Provider value={{ userBubbleLayoutId, showLayoutMorph }}>
      {children}
    </BrunoSkillLaunchContext.Provider>
  );
}

export function useBrunoSkillLaunch() {
  return useContext(BrunoSkillLaunchContext);
}
