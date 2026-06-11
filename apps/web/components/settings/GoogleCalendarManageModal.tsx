'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowsClockwise, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

interface Calendar {
  id: string;
  summary: string;
  colorId: string;
  primary: boolean;
  selected: boolean;
}

interface GoogleCalendarManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onProfileUpdate: (updatedProfile: any) => void;
  onDisconnect: (deleteData: boolean) => void;
}

export function GoogleCalendarManageModal({ isOpen, onClose, profile, onProfileUpdate, onDisconnect }: GoogleCalendarManageModalProps) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [savingCalendars, setSavingCalendars] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [accountLastSyncedAt, setAccountLastSyncedAt] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [syncFrequency, setSyncFrequency] = useState<string>(
    profile?.scheduling_preferences?.google_sync_frequency || 'hourly'
  );

  const handleFrequencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const freq = e.target.value;
    setSyncFrequency(freq);
    const newPrefs = { ...(profile?.scheduling_preferences || {}), google_sync_frequency: freq };
    onProfileUpdate({ ...profile, scheduling_preferences: newPrefs });
    
    await supabase.from('users').update({
      scheduling_preferences: newPrefs
    }).eq('id', profile.id);
  };

  const fetchAccountSyncStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: account } = await supabase
      .from('integration_accounts')
      .select('last_synced_at, last_error, status')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .maybeSingle();
    if (account?.last_synced_at) {
      setAccountLastSyncedAt(account.last_synced_at);
    }
  }, [supabase]);

  const fetchCalendars = useCallback(async () => {
    setLoadingCalendars(true);
    try {
      const res = await fetch('/api/integrations/google/calendars');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn('Could not fetch Google calendars:', data.error || res.statusText);
      } else if (data.success && data.calendars) {
        setCalendars(data.calendars);
      }
    } catch (e) {
      console.error('Failed to fetch calendars', e);
    }
    setLoadingCalendars(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isOpen) {
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        fetchCalendars();
        fetchAccountSyncStatus();
        setSyncResult(null);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, fetchCalendars, fetchAccountSyncStatus]);

  const handleToggleCalendar = async (id: string) => {
    const updated = calendars.map(cal => 
      cal.id === id ? { ...cal, selected: !cal.selected } : cal
    );
    setCalendars(updated);
    
    // Save to backend
    setSavingCalendars(true);
    try {
      const selectedIds = updated.filter(c => c.selected).map(c => c.id);
      await fetch('/api/integrations/google/calendars/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedCalendarIds: selectedIds })
      });
    } catch (e) {
      console.error('Failed to save selected calendars', e);
    }
    setSavingCalendars(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/integrations/google/sync', { 
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSyncResult({ success: false, message: errData.error || res.statusText });
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          setSyncResult({ success: true, message: data.message, count: data.count });
          // Update local state to reflect the new sync time
          const now = new Date().toISOString();
          setAccountLastSyncedAt(now);
          onProfileUpdate({ ...profile, google_calendar_last_synced_at: now });
        } else {
          setSyncResult({ success: false, message: data.error || 'Sync failed.' });
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setSyncResult({ success: false, message: 'Sync timed out.' });
      } else {
        setSyncResult({ success: false, message: e?.message || 'An error occurred.' });
      }
    }
    setSyncing(false);
  };

  // Prefer the generic integration_accounts.last_synced_at over legacy profile field
  const effectiveLastSynced = accountLastSyncedAt || profile?.google_calendar_last_synced_at;
  const lastSyncedText = effectiveLastSynced
    ? `Last synced ${formatDistanceToNow(new Date(effectiveLastSynced))} ago`
    : 'Never synced';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-settings-bg rounded-3xl p-8 max-w-lg w-full pointer-events-auto shadow-2xl border border-settings-border flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-serif italic text-settings-text">Manage Google Calendar</h3>
                  <p className="text-sm font-medium text-settings-text-muted mt-1">
                    {profile?.email}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 bg-settings-card/50 hover:bg-settings-card rounded-full transition-colors border border-settings-border"
                  title="Close"
                >
                  <X size={20} className="text-(--color-ink-soft)" />
                </button>
              </div>

              {/* Sync Settings Section */}
              <div className="bg-settings-card rounded-2xl p-5 border border-settings-border shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-settings-text">Auto-Sync Frequency</h4>
                    <p className="text-xs font-medium text-settings-text-muted mt-0.5">How often Bruno should pull events.</p>
                  </div>
                  <select 
                    value={syncFrequency}
                    onChange={handleFrequencyChange}
                    className="bg-settings-bg border border-settings-border text-settings-text text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-settings-brand"
                    title="Auto-Sync Frequency"
                  >
                    <option value="manual">Manual Only</option>
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Every Day</option>
                    <option value="weekly">Every Week</option>
                  </select>
                </div>
              </div>

              {/* Sync Status Section */}
              <div className="bg-settings-card rounded-2xl p-5 border border-settings-border shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-settings-text">Sync Status</h4>
                    <p className="text-xs font-medium text-settings-text-muted mt-0.5">{lastSyncedText}</p>
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 py-2 px-4 bg-settings-text text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3d3026] transition-colors shadow-sm disabled:opacity-70"
                  >
                    <motion.div
                      animate={{ rotate: syncing ? 360 : 0 }}
                      transition={{ duration: 1, repeat: syncing ? Infinity : 0, ease: "linear" }}
                    >
                      <ArrowsClockwise size={16} weight="bold" />
                    </motion.div>
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>

                {syncResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl border flex items-start gap-3 text-xs font-bold ${
                      syncResult.success 
                        ? 'bg-(--color-sage-soft) border-[#4A3F32]/10 text-(--color-ink-soft)' 
                        : 'bg-(--color-rose-soft) border-[#C56B5E]/10 text-(--color-rose)'
                    }`}
                  >
                    {syncResult.success ? <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600" /> : <WarningCircle size={18} weight="fill" className="shrink-0 text-red-600" />}
                    <div className="flex-1">
                      {syncResult.success ? (
                        <>
                          <span className="block mb-0.5">Sync complete.</span>
                          <span className="text-[11px] font-medium opacity-80">
                            Bruno is tracking {syncResult.count} upcoming event{syncResult.count !== 1 ? 's' : ''} from your selected calendars.
                          </span>
                        </>
                      ) : (
                        syncResult.message
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Calendars List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-settings-text-muted">
                    Selected Calendars
                  </label>
                  {savingCalendars && <span className="text-[10px] font-bold text-settings-brand animate-pulse">Saving...</span>}
                </div>
                
                <div className="bg-settings-card rounded-2xl border border-settings-border shadow-sm max-h-60 overflow-y-auto">
                  {loadingCalendars ? (
                    <div className="p-8 flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D08741]" />
                    </div>
                  ) : calendars.length > 0 ? (
                    <div className="divide-y divide-[#e6dcce]/50">
                      {calendars.map((cal) => (
                        <div key={cal.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleToggleCalendar(cal.id)}>
                          <div className="flex items-center gap-3 truncate pr-4">
                            <div className="w-3 h-3 rounded-full shrink-0" {...({ style: { backgroundColor: cal.colorId ? `#${cal.colorId}` : '#4A3F32' } })} />
                            <span className="text-sm font-bold text-settings-text truncate">{cal.summary}</span>
                            {cal.primary && <span className="text-[9px] font-black uppercase tracking-wider bg-settings-bg text-settings-text-muted px-2 py-0.5 rounded-full shrink-0">Primary</span>}
                          </div>
                          
                          {/* Beautiful Toggle Switch */}
                          <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${cal.selected ? 'bg-[#D08741]' : 'bg-gray-200'}`}>
                            <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-settings-card shadow ring-0 transition duration-200 ease-in-out ${cal.selected ? 'translate-x-4.5' : 'translate-x-1'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm font-medium text-settings-text-muted">
                      No calendars found.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-settings-border mt-2">
                {!isDisconnecting ? (
                  <button
                    onClick={() => setIsDisconnecting(true)}
                    className="w-full py-3 bg-settings-card border border-[#F5D5D0] text-(--color-rose) rounded-xl text-xs font-black uppercase tracking-widest hover:bg-(--color-rose-soft)/30 transition-colors shadow-sm"
                  >
                    Disconnect Account
                  </button>
                ) : (
                  <div className="bg-(--color-rose-soft)/30 border border-[#F5D5D0] rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs font-bold text-(--color-rose)">How would you like to disconnect?</p>
                    <button
                      onClick={() => onDisconnect(false)}
                      className="w-full py-2 bg-settings-card border border-[#F5D5D0] text-(--color-rose) rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      Keep Imported Events
                    </button>
                    <button
                      onClick={() => onDisconnect(true)}
                      className="w-full py-2 bg-(--color-rose) text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#C56B5E] transition-colors"
                    >
                      Delete Imported Events
                    </button>
                    <button
                      onClick={() => setIsDisconnecting(false)}
                      className="w-full py-1 text-xs font-bold text-settings-text-muted hover:text-settings-text transition-colors mt-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
