import React from 'react';

interface SectionBottomActionsProps {
  children?: React.ReactNode;
  align?: 'start' | 'end' | 'between';
  message?: { type: 'success' | 'error', text: string } | null;
}

export function SectionBottomActions({ 
  children, 
  align = 'end',
  message 
}: SectionBottomActionsProps) {
  const alignClass = 
    align === 'end' ? 'justify-end' : 
    align === 'between' ? 'justify-between' : 'justify-start';

  return (
    <div className="bg-settings-bg/50 px-4 py-3 sm:px-6 border-t border-settings-border flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        {message && (
          <div className={`px-3 py-1.5 text-xs font-bold rounded-lg inline-block ${
            message.type === 'success' 
              ? 'bg-[var(--color-sage-soft)] text-[var(--color-ink-soft)]' 
              : 'bg-[var(--color-rose-soft)] text-[var(--color-rose)]'
          }`}>
            {message.text}
          </div>
        )}
      </div>
      
      <div className={`flex items-center gap-3 flex-shrink-0 ${alignClass}`}>
        {children}
      </div>
    </div>
  );
}
