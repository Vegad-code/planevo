'use client';

import React from 'react';
import { CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';

interface SettingsRowProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function SettingsRow({ title, description, icon, action, href, onClick, className = '', children }: SettingsRowProps) {
  const content = (
    <div className={`p-4 transition-colors ${href || onClick ? 'hover:bg-settings-card-hover cursor-pointer' : ''} ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon && (
            <div className="text-settings-text-muted flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-settings-text truncate">{title}</h3>
            {description && (
              <p className="text-xs font-medium text-settings-text-muted mt-0.5 pr-2">{description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          {action}
          {(href || onClick) && !action && (
            <CaretRight weight="bold" className="text-settings-text-muted" />
          )}
        </div>
      </div>
      
      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full text-left">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left appearance-none">
        {content}
      </button>
    );
  }

  return content;
}
