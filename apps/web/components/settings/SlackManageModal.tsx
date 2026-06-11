'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowsClockwise, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

interface SlackManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onProfileUpdate: (updatedProfile: any) => void;
  onDisconnect: (deleteData: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SlackManageModal({ isOpen, onClose, profile, onProfileUpdate, onDisconnect }: SlackManageModalProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [accountLastSyncedAt, setAccountLastSyncedAt] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchAccountSyncStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: account } = await supabase
      .from('integration_accounts')
      .select('last_synced_at, last_error, status')
      .eq('user_id', user.id)
      .eq('provider', 'slack')
      .maybeSingle();
    if (account?.last_synced_at) {
      setAccountLastSyncedAt(account.last_synced_at);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    if (isOpen) {
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        fetchAccountSyncStatus();
        setSyncResult(null);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, fetchAccountSyncStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/integrations/slack/sync', {
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
          const now = new Date().toISOString();
          setAccountLastSyncedAt(now);
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
                  <h3 className="text-2xl font-serif italic text-settings-text">Manage Slack</h3>
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
                            Bruno imported {syncResult.count} saved item{syncResult.count !== 1 ? 's' : ''} from Slack.
                          </span>
                        </>
                      ) : (
                        syncResult.message
                      )}
                    </div>
                  </motion.div>
                )}
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
