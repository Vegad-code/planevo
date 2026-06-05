'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, BookOpen } from '@phosphor-icons/react';

/**
 * Compact theme cycler (Light → Dark → Sepia) wired to next-themes.
 * Safe against hydration mismatch via the `mounted` guard.
 */
export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = (theme === 'system' ? resolvedTheme : theme) || 'light';

  const cycle = () => {
    if (active === 'light') setTheme('dark');
    else if (active === 'dark') setTheme('sepia');
    else setTheme('light');
  };

  if (!mounted) {
    return <div className="w-[120px] h-9 rounded-lg bg-settings-card-hover animate-pulse" />;
  }

  const label = active === 'light' ? 'Dark' : active === 'dark' ? 'Sepia' : 'Light';
  const Icon = active === 'light' ? Moon : active === 'dark' ? BookOpen : Sun;

  return (
    <button
      onClick={cycle}
      data-testid="theme-cycle-toggle"
      className="px-3 py-2 rounded-lg border border-settings-border bg-settings-card text-settings-text hover:bg-settings-card-hover transition-colors active:scale-95 flex items-center gap-2 font-bold uppercase text-xs"
      aria-label="Cycle theme"
    >
      <Icon size={16} weight="bold" />
      <span>{label} mode</span>
    </button>
  );
}
