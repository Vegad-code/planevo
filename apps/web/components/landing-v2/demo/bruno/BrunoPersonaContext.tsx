'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { BRUNO_PERSONAS, getBrunoScenario } from './brunoFixtures';
import type { BrunoPersonaId, BrunoPersonaScenario } from './types';

interface BrunoPersonaContextValue {
  persona: BrunoPersonaId;
  setPersona: (id: BrunoPersonaId) => void;
  scenario: BrunoPersonaScenario;
  personaMeta: (typeof BRUNO_PERSONAS)[number];
}

const BrunoPersonaContext = createContext<BrunoPersonaContextValue | null>(null);

export function BrunoPersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<BrunoPersonaId>('students');

  const value = useMemo(
    () => ({
      persona,
      setPersona,
      scenario: getBrunoScenario(persona),
      personaMeta: BRUNO_PERSONAS.find((p) => p.id === persona) ?? BRUNO_PERSONAS[0],
    }),
    [persona],
  );

  return <BrunoPersonaContext.Provider value={value}>{children}</BrunoPersonaContext.Provider>;
}

export function useBrunoPersona() {
  const ctx = useContext(BrunoPersonaContext);
  if (!ctx) {
    throw new Error('useBrunoPersona must be used within BrunoPersonaProvider');
  }
  return ctx;
}
