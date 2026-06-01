'use client';

import React, { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent) => void;
  defaultOpen?: boolean;
}

export function SettingsSection({ 
  title, 
  description, 
  children, 
  className = '',
  onSubmit,
  defaultOpen = false
}: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Wrapper = onSubmit ? 'form' : 'div';
  
  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 -mx-2 flex justify-between items-center w-full text-left focus:outline-none rounded-xl hover:bg-settings-card/50 transition-colors"
      >
        <div>
          <h2 className="text-lg font-bold text-settings-text">{title}</h2>
          {description && (
            <p className="text-[13px] font-medium text-settings-text-muted mt-0.5">{description}</p>
          )}
        </div>
        <div className="text-settings-text-muted p-2 bg-settings-card border border-settings-border rounded-lg shadow-sm shrink-0 ml-4">
          {isOpen ? <CaretUp weight="bold" /> : <CaretDown weight="bold" />}
        </div>
      </button>

      {isOpen && (
        <Wrapper 
          onSubmit={onSubmit} 
          className="bg-settings-card border border-settings-border rounded-xl overflow-hidden shadow-sm flex flex-col animate-fade-in"
        >
          <div className="flex flex-col divide-y divide-settings-border">
            {children}
          </div>
        </Wrapper>
      )}
    </section>
  );
}

