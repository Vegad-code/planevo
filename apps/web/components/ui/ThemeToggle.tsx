'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');

  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'sepia' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    requestAnimationFrame(() => {
      setTheme(initialTheme);
    });
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    let newTheme: 'light' | 'dark' | 'sepia';
    if (theme === 'light') newTheme = 'dark';
    else if (theme === 'dark') newTheme = 'sepia';
    else newTheme = 'light';
    
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 border-2 border-border bg-card text-foreground hover:bg-muted hover:text-card-foreground transition-all active:scale-95 flex items-center gap-2 font-bold uppercase text-xs"
      aria-label="Toggle Theme"
    >
      {theme === 'light' && (
        <>
          <Moon size={20} weight="bold" />
          <span>Dark Mode</span>
        </>
      )}
      {theme === 'dark' && (
        <>
          <Sun size={20} weight="bold" />
          <span>Sepia Mode</span>
        </>
      )}
      {theme === 'sepia' && (
        <>
          <Sun size={20} weight="bold" />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
}
