'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';
import ColorSchemeToggle from '@/components/ui/ColorSchemeToggle';
import Integrations from '@/components/settings/Integrations';

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in text-foreground">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Settings</h1>
        <p className="text-muted mt-1 text-sm font-medium">Customize your Plant Pilot experience.</p>
      </div>

      {/* Appearance section */}
      <div className="glass p-6">
        <h2 className="text-xl font-bold uppercase mb-6">Appearance</h2>
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted">Mode</h3>
            <div className="flex">
              <ThemeToggle />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted">Color Scheme</h3>
            <p className="text-sm font-medium text-muted mb-4">Choose a primary color that fits your mood.</p>
            <ColorSchemeToggle />
          </div>
        </div>
      
      {/* University Integrations */}
      <Integrations />
      </div>

      {/* Profile section */}
      <div className="glass p-6">
        <h2 className="text-xl font-bold uppercase mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-name" className="block text-xs font-black uppercase mb-1.5">
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              placeholder="Your name"
              className="w-full max-w-md px-4 py-2.5 bg-background border-2 border-border text-foreground placeholder:opacity-50 focus:outline-none focus:shadow-[2px_2px_0px_0px_var(--border)] transition-all"
            />
          </div>
          <div>
            <label htmlFor="settings-energy" className="block text-xs font-black uppercase mb-1.5">
              Peak Energy Time <span className="text-surface-400 font-bold lowercase tracking-normal">(Not Recommended)</span>
            </label>
            <select
              id="settings-energy"
              className="w-full max-w-md px-4 py-2.5 bg-background border-2 border-border text-foreground focus:outline-none focus:shadow-[2px_2px_0px_0px_var(--border)] transition-all"
            >
              <option value="morning">🌅 Morning (6am – 12pm)</option>
              <option value="afternoon">🌤️ Afternoon (12pm – 5pm)</option>
              <option value="evening">🌙 Evening (5pm – 11pm)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscription section */}
      <div className="glass p-6">
        <h2 className="text-xl font-bold uppercase mb-2">Subscription</h2>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-xs font-black border-2 border-border bg-muted text-card">
            Free Plan
          </span>
          <span className="text-muted text-sm font-medium">5 AI uses/month · 3 projects · List view only</span>
        </div>
        <button
          id="settings-upgrade-button"
          className="mt-6 px-6 py-3 border-2 border-border bg-accent-600 hover:bg-accent-500 text-white text-sm font-black uppercase shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
        >
          ✨ Upgrade to Pro — $9/mo
        </button>
      </div>

      {/* Danger zone */}
      <div className="glass p-6 border-red-500!">
        <h2 className="text-xl font-bold uppercase text-error mb-2">Danger Zone</h2>
        <p className="text-muted text-sm mb-4 font-medium">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <button
          id="settings-delete-account"
          className="px-4 py-2 border-2 border-error bg-error/10 hover:bg-error text-error hover:text-white text-xs font-black uppercase transition-all"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
