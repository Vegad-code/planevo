'use client';

import { useState } from 'react';
import { updateProfileAction } from '../../app/dashboard/settings/profile/actions';

export default function ProfileForm({ initialData }: { initialData: any }) {
  const [name, setName] = useState(initialData?.name || '');
  const [energyPreference, setEnergyPreference] = useState(initialData?.energy_preference || 'morning');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateProfileAction({ name, energy_preference: energyPreference });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
    }
    
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e6dcce] p-8 shadow-sm">
      <div className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#8a7b66] tracking-widest">
            Email Address
          </label>
          <input
            type="email"
            value={initialData?.email || ''}
            disabled
            className="w-full bg-[#f4ece1]/50 border border-[#e6dcce] p-3 rounded-xl font-bold text-sm text-[#8a7b66] cursor-not-allowed"
          />
          <p className="text-[10px] font-bold text-[#8a7b66]">Your email is linked to your authentication provider.</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#8a7b66] tracking-widest">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anthony Tarek"
            className="w-full bg-[#fafafa] border border-[#e6dcce] p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors text-[var(--color-ink)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-[#8a7b66] tracking-widest">
            Energy Preference
          </label>
          <select
            value={energyPreference}
            onChange={(e) => setEnergyPreference(e.target.value)}
            className="w-full bg-[#fafafa] border border-[#e6dcce] p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-[var(--color-ink)] transition-colors text-[var(--color-ink)] appearance-none"
          >
            <option value="morning">Morning (I work best early)</option>
            <option value="afternoon">Afternoon (I hit my stride after lunch)</option>
            <option value="evening">Evening (Night owl)</option>
          </select>
          <p className="text-[10px] font-bold text-[#8a7b66]">Helps Bruno schedule your deep work when you're most productive.</p>
        </div>

        {message && (
          <div className={`p-3 text-xs font-bold rounded-xl ${message.type === 'success' ? 'bg-[#D8E2D6] text-[#4A3F32]' : 'bg-[#F5D5D0] text-[#C56B5E]'}`}>
            {message.text}
          </div>
        )}

        <div className="pt-4 flex justify-end border-t border-[#e6dcce]/50">
          <button 
            type="submit" 
            disabled={saving || (!name.trim())}
            className="px-6 py-2.5 bg-[var(--color-ink)] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </form>
  );
}
