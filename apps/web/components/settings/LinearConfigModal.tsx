'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CaretRight } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchLinearTeams, saveLinearPreferences } from '@/lib/integrations/linear';

interface LinearConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export function LinearConfigModal({ isOpen, onClose, onComplete }: LinearConfigModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  const loadTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { teams, selectedTeams } = await fetchLinearTeams(user.id);
      setTeams(teams);
      setSelectedTeamIds(new Set(selectedTeams));
    } catch (err: any) {
      setError(err.message || 'Failed to load Linear teams');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      await saveLinearPreferences(user.id, Array.from(selectedTeamIds));
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

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
              className="bg-settings-bg rounded-3xl p-8 max-w-md w-full pointer-events-auto shadow-2xl border border-settings-border flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-serif italic text-settings-text">Select Linear Teams</h3>
                  <p className="text-sm font-medium text-settings-text-muted mt-1">
                    Choose which teams to sync issues from. Leave all empty to sync everything.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-settings-card/50 hover:bg-settings-card rounded-full transition-colors border border-settings-border"
                >
                  <X size={20} className="text-[var(--color-ink-soft)]" />
                </button>
              </div>

              <div className="bg-settings-card rounded-2xl p-2 border border-settings-border shadow-sm max-h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-sm font-medium text-settings-text-muted">Loading teams...</div>
                ) : error ? (
                  <div className="p-8 text-center text-sm font-medium text-[var(--color-rose)]">{error}</div>
                ) : teams.length === 0 ? (
                  <div className="p-8 text-center text-sm font-medium text-settings-text-muted">No teams found in this workspace.</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {teams.map(team => {
                      const isSelected = selectedTeamIds.has(team.id);
                      return (
                        <button
                          key={team.id}
                          onClick={() => toggleTeam(team.id)}
                          className={`
                            flex items-center justify-between p-3 rounded-xl text-left transition-all
                            ${isSelected ? 'bg-[var(--color-cream)]' : 'hover:bg-[var(--color-paper)]'}
                          `}
                        >
                          <div>
                            <span className="text-sm font-bold text-settings-text">{team.name}</span>
                            <span className="ml-2 text-[10px] font-mono text-settings-text-muted uppercase px-1.5 py-0.5 rounded bg-[var(--color-paper)] border border-settings-border">
                              {team.key}
                            </span>
                          </div>
                          <div className={`
                            w-5 h-5 rounded border flex items-center justify-center transition-colors
                            ${isSelected ? 'bg-settings-text border-settings-text text-white' : 'border-settings-border bg-settings-bg'}
                          `}>
                            {isSelected && <Check size={14} weight="bold" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-settings-text text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#3d3026] transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
