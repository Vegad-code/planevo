'use client';

import { useState, useEffect } from 'react';

const SCHEMES = [
  { id: 'forest', name: 'Forest', color: '#5d8a66' },
  { id: 'aqua', name: 'Aqua', color: '#3a7d8e' },
  { id: 'violet', name: 'Violet', color: '#7d5d8a' },
  { id: 'crimson', name: 'Crimson', color: '#8a5d5d' },
  { id: 'midnight', name: 'Midnight', color: '#2c3e50' },
];

export default function ColorSchemeToggle() {
  const [activeScheme, setActiveScheme] = useState('forest');

  useEffect(() => {
    const savedScheme = localStorage.getItem('theme-color') || 'forest';
    setActiveScheme(savedScheme);
    document.documentElement.setAttribute('data-theme-color', savedScheme);
  }, []);

  const changeScheme = (id: string) => {
    setActiveScheme(id);
    document.documentElement.setAttribute('data-theme-color', id);
    localStorage.setItem('theme-color', id);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {SCHEMES.map((scheme) => (
        <button
          key={scheme.id}
          onClick={() => changeScheme(scheme.id)}
          className={`
            group relative flex flex-col items-center gap-2 p-2 border-2 transition-all
            ${activeScheme === scheme.id 
              ? 'border-foreground bg-card shadow-[4px_4px_0px_0px_var(--border)]' 
              : 'border-border bg-background hover:border-foreground/50'}
          `}
          aria-label={`Switch to ${scheme.name} color scheme`}
        >
          <div 
            className="w-12 h-12 border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]"
            style={{ backgroundColor: scheme.color }}
          />
          <span className={`text-[10px] font-black uppercase tracking-tighter ${activeScheme === scheme.id ? 'text-foreground' : 'text-muted'}`}>
            {scheme.name}
          </span>
          {activeScheme === scheme.id && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-foreground border border-background rotate-45" />
          )}
        </button>
      ))}
    </div>
  );
}
