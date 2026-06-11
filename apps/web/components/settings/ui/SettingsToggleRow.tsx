'use client';

import React from 'react';
import { SettingsRow } from './SettingsRow';

interface SettingsToggleRowProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function SettingsToggleRow({ 
  title, 
  description, 
  icon, 
  checked, 
  onChange, 
  disabled = false,
  children 
}: SettingsToggleRowProps) {
  return (
    <div className="flex flex-col">
      <SettingsRow
        title={title}
        description={description}
        icon={icon}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        action={
          <div 
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-settings-brand focus-visible:ring-offset-2 ${
              checked ? 'bg-settings-brand' : 'bg-settings-border'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={checked}
            aria-label={`Toggle ${title}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-settings-card shadow ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        }
      />
      {checked && children && (
        <div className="px-4 pb-4 pt-1 ml-1 pl-4 border-l-2 border-settings-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
