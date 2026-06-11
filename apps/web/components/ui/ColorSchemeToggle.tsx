'use client';

import { Check } from '@phosphor-icons/react';
import { ACCENTS, useAppearance } from '@/components/providers/AppearanceProvider';

/**
 * Accent color picker wired to AppearanceProvider. Replaces the previous
 * dead component whose schemes had no CSS backing.
 */
export default function ColorSchemeToggle() {
  const { accent, setAccent } = useAppearance();

  return (
    <div className="flex flex-wrap gap-3" data-testid="accent-picker">
      {ACCENTS.map((scheme) => {
        const isActive = accent === scheme.id;
        return (
          <button
            key={scheme.id}
            onClick={() => setAccent(scheme.id)}
            data-testid={`accent-${scheme.id}`}
            aria-pressed={isActive}
            className="group flex flex-col items-center gap-2 focus:outline-none"
            aria-label={`Use ${scheme.name} accent`}
          >
            <span
              className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'ring-2 ring-offset-2 ring-offset-settings-card scale-105'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: scheme.color, boxShadow: isActive ? `0 0 0 2px ${scheme.color}` : undefined }}
            >
              {isActive && <Check size={20} weight="bold" className="text-white" />}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wide ${
                isActive ? 'text-settings-text' : 'text-settings-text-muted'
              }`}
            >
              {scheme.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
