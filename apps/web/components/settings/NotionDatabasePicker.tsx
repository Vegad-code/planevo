'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  Database,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { NotionIcon } from '../icons/BrandIcons';

interface NotionDatabaseOption {
  id: string;
  title: string;
  selected: boolean;
}

interface NotionDatabasePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  lastSyncedAt?: string | null;
}

/**
 * Lets a Pro user pick which Notion databases Planevo should sync into tasks.
 * Selection is persisted in `integration_accounts.metadata.notion_database_ids`
 * and consumed by the Composio sync engine.
 */
export function NotionDatabasePicker({
  isOpen,
  onClose,
  onSaved,
  lastSyncedAt,
}: NotionDatabasePickerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(
    null
  );
  const [databases, setDatabases] = useState<NotionDatabaseOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveResult(null);
    try {
      const res = await fetch('/api/integrations/composio/notion/databases');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load databases');
      const dbs: NotionDatabaseOption[] = data.databases ?? [];
      setDatabases(dbs);
      setSelected(new Set(dbs.filter((d) => d.selected).map((d) => d.id)));
      if (dbs.length === 0 && data.error) setError(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const filteredDatabases = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return databases;
    return databases.filter((db) => db.title.toLowerCase().includes(q));
  }, [databases, filter]);

  const selectedCount = selected.size;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaveResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveResult(null);
    try {
      const res = await fetch('/api/integrations/composio/notion/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved?.();
      setSaveResult({
        success: true,
        message: `Saved ${selected.size} database${selected.size === 1 ? '' : 's'}. Bruno will only sync what you selected.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const lastSyncedText = lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt))} ago`
    : 'Not synced yet';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="notion-manage-title"
              className="bg-settings-bg rounded-3xl p-6 sm:p-8 max-w-xl w-full pointer-events-auto shadow-2xl border border-settings-border flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 bg-white border border-gray-200/50 rounded-xl flex items-center justify-center shadow-inner shrink-0 text-black">
                    <NotionIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      id="notion-manage-title"
                      className="text-2xl font-serif italic text-settings-text leading-tight"
                    >
                      Manage Notion
                    </h3>
                    <p className="text-sm font-medium text-settings-text-muted mt-1">
                      Choose which databases Bruno can read. Everything else stays private.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 bg-settings-card hover:bg-settings-card-hover rounded-full transition-colors border border-settings-border shrink-0 shadow-sm"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={18} weight="bold" className="text-settings-text" />
                </button>
              </div>

              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  weight="bold"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-settings-text-muted pointer-events-none"
                />
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search databases..."
                  className="w-full pl-10 pr-3 py-2.5 bg-settings-card border border-settings-border rounded-xl text-[13px] font-medium text-settings-text placeholder:text-settings-text-muted/80 outline-none focus:ring-2 focus:ring-settings-brand/40 focus:border-settings-brand/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 px-0.5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-settings-text-muted">
                      Databases
                    </p>
                    <p className="text-[11px] font-medium text-settings-text-muted mt-0.5">
                      {selectedCount} selected · Bruno syncs tasks from these only
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(new Set(databases.map((d) => d.id)));
                        setSaveResult(null);
                      }}
                      className="text-[10px] font-bold uppercase tracking-wider text-settings-brand hover:underline"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(new Set());
                        setSaveResult(null);
                      }}
                      className="text-[10px] font-bold uppercase tracking-wider text-settings-text-muted hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="bg-settings-card rounded-2xl border border-settings-border shadow-sm overflow-hidden">
                  {loading ? (
                    <div className="p-4 space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-11 bg-settings-bg rounded-xl animate-pulse border border-settings-border/40"
                        />
                      ))}
                    </div>
                  ) : error ? (
                    <div className="p-5 space-y-3">
                      <div className="flex items-start gap-3 text-(--color-rose)">
                        <WarningCircle size={20} weight="fill" className="shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <p className="text-[13px] font-bold leading-relaxed">{error}</p>
                          <p className="text-[12px] font-medium text-settings-text-muted leading-relaxed">
                            In Notion, open a database → Share → invite the Planevo integration.
                            Then return here and try again.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : filteredDatabases.length === 0 ? (
                    <div className="p-8 text-center">
                      <Database
                        size={28}
                        className="mx-auto mb-3 text-settings-text-muted/60"
                        weight="duotone"
                      />
                      <p className="text-[13px] font-semibold text-settings-text">
                        {databases.length === 0
                          ? 'No databases found'
                          : 'No matches for your search'}
                      </p>
                      <p className="text-[12px] font-medium text-settings-text-muted mt-1 max-w-xs mx-auto">
                        {databases.length === 0
                          ? 'Share at least one database with Planevo in Notion to get started.'
                          : 'Try a different search term.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-settings-border/60 max-h-52 overflow-y-auto">
                      {filteredDatabases.map((db) => {
                        const isSelected = selected.has(db.id);
                        return (
                          <label
                            key={db.id}
                            className={`flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-settings-brand/8 hover:bg-settings-brand/12'
                                : 'hover:bg-settings-bg/80'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggle(db.id)}
                              className="h-4 w-4 shrink-0 rounded border-settings-border accent-[var(--color-settings-brand)]"
                            />
                            <span
                              className={`text-[13px] font-semibold truncate ${
                                isSelected ? 'text-settings-text' : 'text-settings-text/90'
                              }`}
                            >
                              {db.title}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-settings-border bg-settings-card/60 px-4 py-3">
                <p className="text-[11px] font-medium text-settings-text-muted leading-relaxed">
                  <span className="font-bold text-settings-text">Tip:</span> Unselected databases
                  are never read by Planevo — even if they live in the same Notion workspace.
                </p>
              </div>

              <div className="bg-settings-card rounded-2xl p-4 border border-settings-border shadow-sm">
                <p className="text-xs font-bold text-settings-text">Sync status</p>
                <p className="text-[11px] font-medium text-settings-text-muted mt-0.5">
                  {lastSyncedText}
                </p>
                {saveResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 p-3 rounded-xl border flex items-start gap-2.5 text-xs font-bold ${
                      saveResult.success
                        ? 'bg-(--color-sage-soft) border-[#4A3F32]/15 text-(--color-ink-soft)'
                        : 'bg-(--color-rose-soft) border-[#C56B5E]/15 text-(--color-rose)'
                    }`}
                  >
                    <CheckCircle
                      size={17}
                      weight="fill"
                      className="shrink-0 text-emerald-600 mt-0.5"
                    />
                    <span className="leading-relaxed">{saveResult.message}</span>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-settings-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-settings-text-muted hover:bg-settings-card rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest bg-settings-text text-settings-bg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save preferences'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
