export type BrunoContextSource =
  | 'sidebar'
  | 'dashboard'
  | 'daily-plan'
  | 'tasks'
  | 'calendar'
  | 'settings'
  | 'unknown';

export interface BrunoPageContext {
  source?: BrunoContextSource;
  page?: string;
  label?: string;
  payload?: Record<string, unknown>;
}

export interface BrunoContextValue {
  isOpen: boolean;
  openBruno: (context?: BrunoPageContext) => void;
  closeBruno: () => void;
  toggleBruno: (context?: BrunoPageContext) => void;
  currentContext: BrunoPageContext | null;
  setCurrentContext: (context: BrunoPageContext) => void;
  activeThreadId: string | null;
  setActiveThreadId: (threadId: string | null) => void;
}
