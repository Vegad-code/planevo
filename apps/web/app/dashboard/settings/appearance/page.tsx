'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Sun, Moon, BookOpen, Desktop, Check, TextAa, Sparkle, ArrowCounterClockwise } from '@phosphor-icons/react';
import ColorSchemeToggle from '@/components/ui/ColorSchemeToggle';
import { useAppearance, FONT_SIZES, ACCENTS } from '@/components/providers/AppearanceProvider';
import { SettingsSection } from '@/components/settings/ui/SettingsSection';
import { SettingsToggleRow } from '@/components/settings/ui/SettingsToggleRow';

const THEME_MODES = [
  { id: 'system', name: 'System', desc: 'Match your device', icon: Desktop, swatch: ['bg-[#FBF6EA]', 'bg-[#09090b]', 'bg-[#8A7B66]'] },
  { id: 'light', name: 'Light', desc: 'Warm cream & honey', icon: Sun, swatch: ['bg-[#FBF6EA]', 'bg-[#F2E8D2]', 'bg-[#2A2118]'] },
  { id: 'dark', name: 'Dark', desc: 'Warm espresso & slate', icon: Moon, swatch: ['bg-[#09090b]', 'bg-[#121214]', 'bg-[#fafafa]'] },
] as const;

const fontSizeClasses: Record<string, string> = {
  compact: 'text-[1.288rem]',
  default: 'text-[1.4rem]',
  large: 'text-[1.54rem]',
};

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize, reduceMotion, setReduceMotion, accent, resetAppearance } = useAppearance();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    (async () => {
      await Promise.resolve();
      setMounted(true);
    })();
  }, []);

  const activeAccent = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];

  return (
    <div className="space-y-10 animate-fade-in text-settings-text" data-testid="appearance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic text-settings-text mb-3">Appearance</h2>
          <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
            Customize how Planevo looks and feels. Changes apply instantly and are saved to this device.
          </p>
        </div>
        <button
          onClick={resetAppearance}
          data-testid="appearance-reset"
          className="self-start md:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-settings-border text-settings-text-muted hover:text-settings-text hover:bg-settings-card-hover transition-colors text-xs font-bold uppercase tracking-wide"
        >
          <ArrowCounterClockwise size={15} weight="bold" />
          Reset
        </button>
      </div>

      {/* Theme mode */}
      <SettingsSection title="Theme" description="Pick the mood for your whole workspace.">
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="theme-mode-grid">
            {THEME_MODES.map((mode) => {
              const isActive = mounted && theme === mode.id;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setTheme(mode.id)}
                  data-testid={`theme-mode-${mode.id}`}
                  {...({ 'aria-pressed': isActive })}
                  className={`group text-left rounded-2xl border p-4 transition-all duration-200 ${
                    isActive
                      ? 'border-settings-brand bg-settings-card shadow-md ring-1 ring-settings-brand'
                      : 'border-settings-border bg-settings-card hover:border-settings-brand/50 hover:-translate-y-0.5'
                  }`}
                >
                  {/* Mini preview */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {mode.swatch.map((c, i) => (
                      <span key={i} className={`w-5 h-8 rounded-md border border-black/5 ${c}`} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={16} weight="bold" className="text-settings-brand" />
                      <span className="text-sm font-bold text-settings-text">{mode.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-settings-brand flex items-center justify-center">
                        <Check size={12} weight="bold" className="text-white" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-settings-text-muted mt-1">{mode.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </SettingsSection>

      {/* Accent color */}
      <SettingsSection title="Accent color" description={`Currently ${activeAccent.name} — used for buttons, links & highlights.`}>
        <div className="p-5">
          <ColorSchemeToggle />
        </div>
      </SettingsSection>

      {/* Text size */}
      <SettingsSection title="Text size" description="Scale the entire interface for comfort.">
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3" data-testid="font-size-grid">
            {FONT_SIZES.map((size) => {
              const isActive = fontSize === size.id;
              return (
                <button
                  key={size.id}
                  onClick={() => setFontSize(size.id)}
                  data-testid={`font-size-${size.id}`}
                  {...({ 'aria-pressed': isActive })}
                  className={`rounded-2xl border p-4 flex flex-col items-center gap-1 transition-all duration-200 ${
                    isActive
                      ? 'border-settings-brand bg-settings-card shadow-md ring-1 ring-settings-brand'
                      : 'border-settings-border bg-settings-card hover:border-settings-brand/50'
                  }`}
                >
                  <span className={`font-serif text-settings-text ${fontSizeClasses[size.id] || 'text-[1.4rem]'}`}>
                    Aa
                  </span>
                  <span className="text-xs font-bold text-settings-text">{size.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SettingsSection>

      {/* Reduced motion */}
      <SettingsSection title="Reduce motion" description="Minimize Bruno's animations and UI transitions. Great for focus or motion sensitivity.">
        <SettingsToggleRow
          title="Enable reduced motion"
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
      </SettingsSection>

      {/* Preview */}
      <SettingsSection title="Preview" description="See how your workspace looks with current settings.">
        <div className="p-6 bg-settings-bg border-t border-settings-border/10" data-testid="appearance-preview">
          <div className="rounded-xl border border-settings-border bg-settings-card p-5 max-w-md mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-settings-brand flex items-center justify-center text-white font-black">B</div>
              <div>
                <p className="font-black text-settings-text leading-tight">Today&apos;s plan is ready</p>
                <p className="text-[11px] text-settings-text-muted uppercase tracking-widest font-bold">Bruno · just now</p>
              </div>
            </div>
            <p className="text-sm text-settings-text-muted">
              You&apos;ve got 3 focus blocks and a deadline at 4pm. Want me to protect your morning?
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-lg text-white text-sm font-bold bg-settings-brand">
                Looks good
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-bold border border-settings-border text-settings-text hover:bg-settings-card-hover transition-colors">
                Adjust
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
