'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Customize your Plant Pilot experience.</p>
      </div>

      {/* Profile section */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              placeholder="Your name"
              className="w-full max-w-md px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="settings-energy" className="block text-sm font-medium text-slate-300 mb-1.5">
              Peak Energy Time
            </label>
            <select
              id="settings-energy"
              className="w-full max-w-md px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            >
              <option value="morning">🌅 Morning (6am – 12pm)</option>
              <option value="afternoon">🌤️ Afternoon (12pm – 5pm)</option>
              <option value="evening">🌙 Evening (5pm – 11pm)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscription section */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Subscription</h2>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-surface-600 text-slate-300 border border-surface-500">
            Free Plan
          </span>
          <span className="text-slate-500 text-sm">5 AI uses/month · 3 projects · List view only</span>
        </div>
        <button
          id="settings-upgrade-button"
          className="mt-4 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.98]"
        >
          ✨ Upgrade to Pro — $9/mo
        </button>
      </div>

      {/* Danger zone */}
      <div className="glass rounded-2xl p-6 border border-red-500/10">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-slate-400 text-sm mb-4">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <button
          id="settings-delete-account"
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl border border-red-500/20 transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
