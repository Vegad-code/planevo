'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, BookOpen, Desktop, Check, TextAa, Sparkle, ArrowCounterClockwise } from '@phosphor-icons/react';
import ColorSchemeToggle from '@/components/ui/ColorSchemeToggle';
import { useAppearance, FONT_SIZES, ACCENTS } from '@/components/providers/AppearanceProvider';

const THEME_MODES = [
  { id: 'light', name: 'Light', desc: 'Warm cream & honey', icon: Sun, swatch: ['#FBF6EA', '#F2E8D2', '#2A2118'] },
  { id: 'dark', name: 'Dark', desc: 'Cozy espresso', icon: Moon, swatch: ['#16110c', '#221b14', '#f7efe1'] },
  { id: 'sepia', name: 'Sepia', desc: 'Easy-on-eyes parchment', icon: BookOpen, swatch: ['#f4ead2', '#fbf3df', '#3a2f1f'] },
  { id: 'system', name: 'System', desc: 'Match your device', icon: Desktop, swatch: ['#FBF6EA', '#16110c', '#8A7B66'] },
] as const;

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize, reduceMotion, setReduceMotion, accent, resetAppearance } = useAppearance();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-black text-settings-text">Theme</h3>
          <p className="text-xs text-settings-text-muted mt-0.5">Pick the mood for your whole workspace.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="theme-mode-grid">
          {THEME_MODES.map((mode) => {
            const isActive = mounted && theme === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setTheme(mode.id)}
                data-testid={`theme-mode-${mode.id}`}
                aria-pressed={isActive}
                className={`group text-left rounded-2xl border p-4 transition-all duration-200 ${
                  isActive
                    ? 'border-settings-brand bg-settings-card shadow-md ring-1 ring-settings-brand'
                    : 'border-settings-border bg-settings-card hover:border-settings-brand/50 hover:-translate-y-0.5'
                }`}
              >
                {/* Mini preview */}
                <div className="flex items-center gap-1.5 mb-3">
                  {mode.swatch.map((c, i) => (
                    <span key={i} className="w-5 h-8 rounded-md border border-black/5" style={{ backgroundColor: c }} />
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
      </section>

      {/* Accent color */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkle size={18} weight="fill" className="text-settings-brand" />
          <div>
            <h3 className="text-base font-black text-settings-text">Accent color</h3>
            <p className="text-xs text-settings-text-muted mt-0.5">
              Currently <span className="font-bold text-settings-text">{activeAccent.name}</span> — used for buttons, links & highlights.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-settings-border bg-settings-card p-5">
          <ColorSchemeToggle />
        </div>
      </section>

      {/* Text size */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TextAa size={18} weight="bold" className="text-settings-brand" />
          <div>
            <h3 className="text-base font-black text-settings-text">Text size</h3>
            <p className="text-xs text-settings-text-muted mt-0.5">Scale the entire interface for comfort.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3" data-testid="font-size-grid">
          {FONT_SIZES.map((size) => {
            const isActive = fontSize === size.id;
            return (
              <button
                key={size.id}
                onClick={() => setFontSize(size.id)}
                data-testid={`font-size-${size.id}`}
                aria-pressed={isActive}
                className={`rounded-2xl border p-4 flex flex-col items-center gap-1 transition-all duration-200 ${
                  isActive
                    ? 'border-settings-brand bg-settings-card shadow-md ring-1 ring-settings-brand'
                    : 'border-settings-border bg-settings-card hover:border-settings-brand/50'
                }`}
              >
                <span className="font-serif text-settings-text" style={{ fontSize: `${size.scale * 1.4}rem` }}>
                  Aa
                </span>
                <span className="text-xs font-bold text-settings-text">{size.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Reduced motion */}
      <section className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-settings-border bg-settings-card p-5">
          <div className="pr-4">
            <h3 className="text-base font-black text-settings-text">Reduce motion</h3>
            <p className="text-xs text-settings-text-muted mt-1 max-w-md">
              Minimize Bruno's animations and UI transitions. Great for focus or motion sensitivity.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={reduceMotion}
            data-testid="reduce-motion-toggle"
            onClick={() => setReduceMotion(!reduceMotion)}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
              reduceMotion ? 'bg-settings-brand' : 'bg-settings-border'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                reduceMotion ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Live preview */}
      <section className="space-y-4">
        <h3 className="text-base font-black text-settings-text">Live preview</h3>
        <div className="rounded-2xl border border-settings-border bg-settings-bg p-6" data-testid="appearance-preview">
          <div className="rounded-xl border border-settings-border bg-settings-card p-5 max-w-md space-y-4">
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
              <button className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: 'var(--color-honey)' }}>
                Looks good
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-bold border border-settings-border text-settings-text hover:bg-settings-card-hover transition-colors">
                Adjust
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
