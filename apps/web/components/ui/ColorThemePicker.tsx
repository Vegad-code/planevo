'use client';

import { Check } from '@phosphor-icons/react';
import { COLOR_THEMES } from '@planevo/theme';
import { useAppearance } from '@/components/providers/AppearanceProvider';

/**
 * Full-app color theme picker with 4-stripe palette previews.
 */
export default function ColorThemePicker() {
  const { colorTheme, setColorTheme } = useAppearance();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" data-testid="color-theme-picker">
      {COLOR_THEMES.map((theme) => {
        const isActive = colorTheme === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setColorTheme(theme.id)}
            data-testid={`color-theme-${theme.id}`}
            aria-pressed={isActive}
            className="group flex flex-col items-center gap-2 focus:outline-none"
            aria-label={`Use ${theme.name} app color`}
          >
            <span
              className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden flex flex-col transition-all duration-200 ${
                isActive
                  ? 'ring-2 ring-offset-2 ring-offset-settings-card ring-settings-brand scale-[1.02]'
                  : 'hover:scale-[1.02]'
              }`}
            >
              {theme.swatches.map((color, i) => (
                <span key={i} className="flex-1 w-full" style={{ backgroundColor: color }} />
              ))}
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check size={22} weight="bold" className="text-white drop-shadow" />
                </span>
              )}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wide text-center ${
                isActive ? 'text-settings-text' : 'text-settings-text-muted'
              }`}
            >
              {theme.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
