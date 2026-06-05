'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowsClockwise, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

interface Database {
  id: string;
  title: string;
  selected: boolean;
}

interface NotionManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onProfileUpdate: (updatedProfile: any) => void;
  onDisconnect: (deleteData: boolean) => void;
}

export function NotionManageModal({ isOpen, onClose, profile, onProfileUpdate, onDisconnect }: NotionManageModalProps) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [savingDatabases, setSavingDatabases] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      fetchDatabases();
      fetchAccountSyncStatus();
      setSyncResult(null);
    }
  }, [isOpen]);

  const fetchAccountSyncStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: account } = await supabase
      .from('integration_accounts')
      .select('last_synced_at, last_error, status')
      .eq('user_id', user.id)
      .eq('provider', 'notion')
      .maybeSingle();
    if (account?.last_synced_at) {
      setAccountLastSyncedAt(account.last_synced_at);
    }
  };

  const fetchDatabases = async () => {
    setLoadingDatabases(true);
    try {
      const res = await fetch('/api/integrations/notion/databases');
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json().catch(() => ({}));
      if (data.success && data.databases) {
        setDatabases(data.databases);
      }
    } catch (e) {
      console.error('Failed to fetch databases', e);
    }
    setLoadingDatabases(false);
  };

  const handleToggleDatabase = async (id: string) => {
    const updated = databases.map(db =>
      db.id === id ? { ...db, selected: !db.selected } : db
    );
    setDatabases(updated);

    // Save to backend
    setSavingDatabases(true);
    try {
      const selectedIds = updated.filter(c => c.selected).map(c => c.id);
      await fetch('/api/integrations/notion/databases/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedDatabaseIds: selectedIds })
      });
    } catch (e) {
      console.error('Failed to save selected databases', e);
    }
    setSavingDatabases(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/integrations/notion/sync', {
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
        } else {
          setSyncResult({ success: false, message: data.error || 'Sync failed.' });
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setSyncResult({ success: false, message: 'Sync timed out.' });
      } else {
        setSyncResult({ success: false, message: e?.message || 'An error occurred.' });
      }
    }
    setSyncing(false);
  };

  // Prefer the generic integration_accounts.last_synced_at
  const effectiveLastSynced = accountLastSyncedAt;
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
                  <h3 className="text-2xl font-serif italic text-settings-text">Manage Notion</h3>
                  <p className="text-sm font-medium text-settings-text-muted mt-1">
                    {profile?.email}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-settings-card/50 hover:bg-settings-card rounded-full transition-colors border border-settings-border"
                >
                  <X size={20} className="text-[var(--color-ink-soft)]" />
                </button>
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
                        ? 'bg-[var(--color-sage-soft)] border-[#4A3F32]/10 text-[var(--color-ink-soft)]'
                        : 'bg-[var(--color-rose-soft)] border-[#C56B5E]/10 text-[var(--color-rose)]'
                    }`}
                  >
                    {syncResult.success ? <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600" /> : <WarningCircle size={18} weight="fill" className="shrink-0 text-red-600" />}
                    <div className="flex-1">
                      {syncResult.success ? (
                        <>
                          <span className="block mb-0.5">Sync complete.</span>
                          <span className="text-[11px] font-medium opacity-80">
                            Bruno is tracking {syncResult.count} upcoming item{syncResult.count !== 1 ? 's' : ''} from your selected databases.
                          </span>
                        </>
                      ) : (
                        syncResult.message
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Databases List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-settings-text-muted">
                    Selected Databases
                  </label>
                  {savingDatabases && <span className="text-[10px] font-bold text-settings-brand animate-pulse">Saving...</span>}
                </div>

                <div className="bg-settings-card rounded-2xl border border-settings-border shadow-sm max-h-60 overflow-y-auto">
                  {loadingDatabases ? (
                    <div className="p-8 flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D08741]" />
                    </div>
                  ) : databases.length > 0 ? (
                    <div className="divide-y divide-[#e6dcce]/50">
                      {databases.map((db) => (
                        <div key={db.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleToggleDatabase(db.id)}>
                          <div className="flex items-center gap-3 truncate pr-4">
                            <span className="text-sm font-bold text-settings-text truncate">{db.title}</span>
                          </div>

                          {/* Beautiful Toggle Switch */}
                          <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${db.selected ? 'bg-[#D08741]' : 'bg-gray-200'}`}>
                            <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-settings-card shadow ring-0 transition duration-200 ease-in-out ${db.selected ? 'translate-x-4.5' : 'translate-x-1'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm font-medium text-settings-text-muted">
                      No databases found. Make sure you have shared them with the Notion integration.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-settings-border mt-2">
                {!isDisconnecting ? (
                  <button
                    onClick={() => setIsDisconnecting(true)}
                    className="w-full py-3 bg-settings-card border border-[#F5D5D0] text-[var(--color-rose)] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[var(--color-rose-soft)]/30 transition-colors shadow-sm"
                  >
                    Disconnect Account
                  </button>
                ) : (
                  <div className="bg-[var(--color-rose-soft)]/30 border border-[#F5D5D0] rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs font-bold text-[var(--color-rose)]">How would you like to disconnect?</p>
                    <button
                      onClick={() => onDisconnect(false)}
                      className="w-full py-2 bg-settings-card border border-[#F5D5D0] text-[var(--color-rose)] rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      Keep Imported Items
                    </button>
                    <button
                      onClick={() => onDisconnect(true)}
                      className="w-full py-2 bg-[var(--color-rose)] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#C56B5E] transition-colors"
                    >
                      Delete Imported Items
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
