'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { SlackIcon, LinearIcon } from '../icons/BrandIcons';

type ComposioManageProvider = 'slack' | 'linear';

interface SelectableOption {
  id: string;
  title: string;
  selected: boolean;
}

interface SlackChannelOption extends SelectableOption {
  isPrivate?: boolean;
}

interface LinearProjectOption extends SelectableOption {
  teamId?: string | null;
}

interface ComposioManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: ComposioManageProvider | null;
  lastSyncedAt?: string | null;
  onSaved?: () => void;
}

function SelectionList({
  label,
  description,
  items,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  emptyText,
}: {
  label: string;
  description: string;
  items: SelectableOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-settings-text-muted">
            {label}
          </label>
          <p className="text-[11px] font-medium text-settings-text-muted mt-0.5">{description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[10px] font-bold uppercase tracking-wider text-settings-brand hover:underline"
          >
            All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] font-bold uppercase tracking-wider text-settings-text-muted hover:underline"
          >
            None
          </button>
        </div>
      </div>
      <div className="bg-settings-card rounded-2xl border border-settings-border shadow-sm max-h-44 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-4 text-center text-[12px] font-medium text-settings-text-muted">
            {emptyText}
          </div>
        ) : (
          <div className="divide-y divide-settings-border/50">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 hover:bg-settings-bg/60 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="h-4 w-4 accent-[var(--color-settings-brand)]"
                />
                <span className="text-[13px] text-settings-text font-medium truncate">
                  {item.title}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComposioManageModal({
  isOpen,
  onClose,
  provider,
  lastSyncedAt,
  onSaved,
}: ComposioManageModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [localLastSyncedAt, setLocalLastSyncedAt] = useState<string | null>(lastSyncedAt ?? null);
  const [filter, setFilter] = useState('');

  const [channels, setChannels] = useState<SlackChannelOption[]>([]);
  const [teams, setTeams] = useState<SelectableOption[]>([]);
  const [projects, setProjects] = useState<LinearProjectOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  const [includeStarred, setIncludeStarred] = useState(true);
  const [includeDms, setIncludeDms] = useState(false);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me'>('all');

  const providerInfo = useMemo(() => {
    if (provider === 'slack') {
      return { name: 'Slack', icon: <SlackIcon className="w-6 h-6" /> };
    }
    if (provider === 'linear') {
      return { name: 'Linear', icon: <LinearIcon className="w-6 h-6" /> };
    }
    return null;
  }, [provider]);

  const load = useCallback(async (options?: { includeDmsOverride?: boolean }) => {
    if (!provider) return;
    setLoading(true);
    setError(null);
    setSyncResult(null);
    try {
      const endpoint =
        provider === 'slack'
          ? `/api/integrations/composio/slack/settings${
              options?.includeDmsOverride ? '?includeDms=true' : ''
            }`
          : '/api/integrations/composio/linear/settings';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load settings');

      if (provider === 'slack') {
        const list: SlackChannelOption[] = data.channels ?? [];
        setChannels(list);
        setSelectedIds(new Set(list.filter((c) => c.selected).map((c) => c.id)));
        setIncludeStarred(data.preferences?.include_starred !== false);
        setIncludeDms(data.preferences?.include_dms === true);
        if (list.length === 0 && data.error) setError(data.error);
      } else {
        const teamList: SelectableOption[] = data.teams ?? [];
        const projectList: LinearProjectOption[] = data.projects ?? [];
        setTeams(teamList);
        setProjects(projectList);
        setSelectedTeamIds(new Set(teamList.filter((t) => t.selected).map((t) => t.id)));
        setSelectedProjectIds(new Set(projectList.filter((p) => p.selected).map((p) => p.id)));
        setIncludeCompleted(data.preferences?.include_completed === true);
        setAssigneeFilter(data.preferences?.assignee_filter === 'me' ? 'me' : 'all');
        if (teamList.length === 0 && projectList.length === 0 && data.error) {
          setError(data.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (isOpen && provider) {
      setLocalLastSyncedAt(lastSyncedAt ?? null);
      void load();
    }
  }, [isOpen, provider, lastSyncedAt, load]);

  const filteredChannels = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((c) => c.title.toLowerCase().includes(q));
  }, [channels, filter]);

  const filteredProjects = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = projects;
    if (selectedTeamIds.size > 0) {
      list = list.filter((p) => !p.teamId || selectedTeamIds.has(p.teamId));
    }
    if (!q) return list;
    return list.filter((p) => p.title.toLowerCase().includes(q));
  }, [projects, filter, selectedTeamIds]);

  const handleSave = async () => {
    if (!provider) return;
    setSaving(true);
    setError(null);
    try {
      const endpoint =
        provider === 'slack'
          ? '/api/integrations/composio/slack/settings'
          : '/api/integrations/composio/linear/settings';
      const body =
        provider === 'slack'
          ? {
              channelIds: Array.from(selectedIds),
              includeStarred,
              includeDms,
            }
          : {
              teamIds: Array.from(selectedTeamIds),
              projectIds: Array.from(selectedProjectIds),
              includeCompleted,
              assigneeFilter,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      onSaved?.();
      setSyncResult({
        success: true,
        message: 'Preferences saved. Bruno will only sync what you selected.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!provider) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/integrations/composio/sync?provider=${provider}&force=true`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncResult({ success: false, message: data.error || 'Sync failed.' });
        return;
      }
      const now = new Date().toISOString();
      setLocalLastSyncedAt(now);
      setSyncResult({ success: true, message: 'Sync complete with your current preferences.' });
      onSaved?.();
    } catch {
      setSyncResult({ success: false, message: 'Sync failed. Try again in a moment.' });
    } finally {
      setSyncing(false);
    }
  };

  if (!provider || !providerInfo) return null;

  const lastSyncedText = localLastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(localLastSyncedAt))} ago`
    : 'Not synced yet';

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
              className="bg-settings-bg rounded-3xl p-6 sm:p-8 max-w-xl w-full pointer-events-auto shadow-2xl border border-settings-border flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white border border-gray-200/50 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                    {providerInfo.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif italic text-settings-text">
                      Manage {providerInfo.name}
                    </h3>
                    <p className="text-sm font-medium text-settings-text-muted mt-1">
                      Choose what Bruno can read from {providerInfo.name}.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-settings-card/50 hover:bg-settings-card rounded-full transition-colors border border-settings-border shrink-0"
                  title="Close"
                >
                  <X size={20} className="text-(--color-ink-soft)" />
                </button>
              </div>

              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-settings-text-muted"
                />
                <input
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={
                    provider === 'slack' ? 'Search channels...' : 'Search projects...'
                  }
                  className="w-full pl-9 pr-3 py-2.5 bg-settings-card border border-settings-border rounded-xl text-[13px] text-settings-text outline-none focus:ring-2 focus:ring-settings-brand"
                />
              </div>

              {loading ? (
                <div className="space-y-2 py-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 bg-settings-card rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-[13px] text-(--color-rose) bg-(--color-rose-soft)/30 border border-[#F5D5D0] rounded-xl p-4">
                  {error}
                </div>
              ) : provider === 'slack' ? (
                <>
                  <SelectionList
                    label="Channels"
                    description="Only messages from selected channels are synced into Planevo."
                    items={filteredChannels}
                    selected={selectedIds}
                    onToggle={(id) =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                    }
                    onSelectAll={() => setSelectedIds(new Set(channels.map((c) => c.id)))}
                    onClearAll={() => setSelectedIds(new Set())}
                    emptyText="No channels found. Check your Slack connection scopes."
                  />
                  <div className="bg-settings-card rounded-2xl border border-settings-border p-4 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeStarred}
                        onChange={(e) => setIncludeStarred(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[var(--color-settings-brand)]"
                      />
                      <span>
                        <span className="block text-[13px] font-bold text-settings-text">
                          Include starred items
                        </span>
                        <span className="block text-[11px] font-medium text-settings-text-muted mt-0.5">
                          Pull messages and items you have starred in Slack.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDms}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setIncludeDms(next);
                          void load({ includeDmsOverride: next });
                        }}
                        className="mt-0.5 h-4 w-4 accent-[var(--color-settings-brand)]"
                      />
                      <span>
                        <span className="block text-[13px] font-bold text-settings-text">
                          Show direct messages in channel list
                        </span>
                        <span className="block text-[11px] font-medium text-settings-text-muted mt-0.5">
                          Lets you opt in to syncing DMs. Reload the list after toggling.
                        </span>
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <SelectionList
                    label="Teams"
                    description="Limit issues to selected Linear teams."
                    items={teams}
                    selected={selectedTeamIds}
                    onToggle={(id) =>
                      setSelectedTeamIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                    }
                    onSelectAll={() => setSelectedTeamIds(new Set(teams.map((t) => t.id)))}
                    onClearAll={() => setSelectedTeamIds(new Set())}
                    emptyText="No teams found in your Linear workspace."
                  />
                  <SelectionList
                    label="Projects"
                    description="When projects are selected, only their issues sync. Leave empty to use team filters only."
                    items={filteredProjects}
                    selected={selectedProjectIds}
                    onToggle={(id) =>
                      setSelectedProjectIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                    }
                    onSelectAll={() =>
                      setSelectedProjectIds(new Set(filteredProjects.map((p) => p.id)))
                    }
                    onClearAll={() => setSelectedProjectIds(new Set())}
                    emptyText="No projects found. Try selecting a team first."
                  />
                  <div className="bg-settings-card rounded-2xl border border-settings-border p-4 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCompleted}
                        onChange={(e) => setIncludeCompleted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[var(--color-settings-brand)]"
                      />
                      <span>
                        <span className="block text-[13px] font-bold text-settings-text">
                          Include completed issues
                        </span>
                        <span className="block text-[11px] font-medium text-settings-text-muted mt-0.5">
                          Off by default — Bruno usually only needs open work.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assigneeFilter === 'me'}
                        onChange={(e) => setAssigneeFilter(e.target.checked ? 'me' : 'all')}
                        className="mt-0.5 h-4 w-4 accent-[var(--color-settings-brand)]"
                      />
                      <span>
                        <span className="block text-[13px] font-bold text-settings-text">
                          Only issues assigned to me
                        </span>
                        <span className="block text-[11px] font-medium text-settings-text-muted mt-0.5">
                          Hide issues owned by teammates.
                        </span>
                      </span>
                    </label>
                  </div>
                </>
              )}

              <div className="bg-settings-card rounded-2xl p-4 border border-settings-border shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-settings-text">Sync status</h4>
                    <p className="text-xs font-medium text-settings-text-muted mt-0.5">
                      {lastSyncedText}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing || loading}
                    className="flex items-center gap-2 py-2 px-4 bg-settings-text text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3d3026] transition-colors shadow-sm disabled:opacity-70 shrink-0"
                  >
                    <motion.div
                      animate={{ rotate: syncing ? 360 : 0 }}
                      transition={{ duration: 1, repeat: syncing ? Infinity : 0, ease: 'linear' }}
                    >
                      <ArrowsClockwise size={16} weight="bold" />
                    </motion.div>
                    {syncing ? 'Syncing...' : 'Sync now'}
                  </button>
                </div>
                {syncResult && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-3 text-xs font-bold ${
                      syncResult.success
                        ? 'bg-(--color-sage-soft) border-[#4A3F32]/10 text-(--color-ink-soft)'
                        : 'bg-(--color-rose-soft) border-[#C56B5E]/10 text-(--color-rose)'
                    }`}
                  >
                    {syncResult.success ? (
                      <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-600" />
                    ) : (
                      <WarningCircle size={18} weight="fill" className="shrink-0 text-red-600" />
                    )}
                    <span>{syncResult.message}</span>
                  </div>
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
                  className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest bg-settings-text text-settings-bg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
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
