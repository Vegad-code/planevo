'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Bell, BellRinging, EnvelopeSimple, AppWindow, Moon, WarningCircle, CheckCircle, PaperPlaneRight, CalendarBlank } from '@phosphor-icons/react';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsToggleRow } from './ui/SettingsToggleRow';
import { SettingsRow } from './ui/SettingsRow';
import {
  NotificationPreferences,
  ensureDetectedTimezone,
  updateNotificationPreferences,
} from '@/app/dashboard/settings/notifications/actions';
import type { NotificationDeliveryInsight } from '@/lib/notifications/insights';

interface Props {
  initialPreferences: NotificationPreferences;
  initialDeliveryInsight: NotificationDeliveryInsight;
}

const timezones = Intl.supportedValuesOf('timeZone');

function formatDeliveryType(type: string) {
  return type.replace(/_/g, ' ');
}

function formatSentAt(sentAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(sentAt));
}

export function NotificationPreferencesForm({ initialPreferences, initialDeliveryInsight }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences);
  const [deliveryInsight] = useState<NotificationDeliveryInsight>(initialDeliveryInsight);
  const [, startTransition] = useTransition();
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [emailTestStatus, setEmailTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailTestMessage, setEmailTestMessage] = useState('');
  const timezoneBootstrapped = useRef(false);

  useEffect(() => {
    if (timezoneBootstrapped.current) return;
    timezoneBootstrapped.current = true;

    if (prefs.quiet_hours.timezone !== 'UTC') return;

    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detectedTimezone || detectedTimezone === 'UTC') return;

    setPrefs((current) => ({
      ...current,
      quiet_hours: { ...current.quiet_hours, timezone: detectedTimezone },
    }));

    startTransition(() => {
      ensureDetectedTimezone(detectedTimezone).catch((error) => {
        console.error('Failed to persist detected timezone', error);
      });
    });
  }, [prefs.quiet_hours.timezone]);

  const handleUpdate = (updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>) => {
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    startTransition(() => {
      updateNotificationPreferences(updates).catch((err) => {
        console.error('Failed to update preferences', err);
      });
    });
  };

  const handleTestEmail = async () => {
    setEmailTestStatus('loading');
    setEmailTestMessage('');
    try {
      const res = await fetch('/api/notifications/test-email', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEmailTestStatus('success');
        setEmailTestMessage(data.message || 'Test email sent!');
      } else {
        setEmailTestStatus('error');
        setEmailTestMessage(data.error || 'Failed to send test email');
      }
    } catch (err: unknown) {
      setEmailTestStatus('error');
      setEmailTestMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleTestPush = async () => {
    setTestStatus('loading');
    setTestMessage('');
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTestStatus('success');
        setTestMessage(data.message || 'Test notification sent!');
      } else {
        setTestStatus('error');
        setTestMessage(data.error || 'Failed to send test notification');
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      <SettingsSection title="Email Delivery Status" description="Why automated emails may or may not have reached your inbox.">
        <div className="px-4 pb-4 flex flex-col gap-3">
          {deliveryInsight.lastAutomatedEmail ? (
            <p className="text-sm text-settings-text">
              Last automated email: <span className="font-semibold">{formatDeliveryType(deliveryInsight.lastAutomatedEmail.type)}</span> on {formatSentAt(deliveryInsight.lastAutomatedEmail.sentAt)}.
            </p>
          ) : (
            <p className="text-sm text-settings-text">No automated Planevo emails have been logged for this account yet.</p>
          )}
          {deliveryInsight.lastAutomatedPush ? (
            <p className="text-sm text-settings-text">
              Last automated push: <span className="font-semibold">{formatDeliveryType(deliveryInsight.lastAutomatedPush.type)}</span> on {formatSentAt(deliveryInsight.lastAutomatedPush.sentAt)}.
            </p>
          ) : (
            <p className="text-sm text-settings-text-muted">No automated push notifications logged yet.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-3 text-sm text-settings-text-muted">
            <div>Tasks due today: <span className="font-semibold text-settings-text">{deliveryInsight.tasksDueToday}</span></div>
            <div>Tasks due soon: <span className="font-semibold text-settings-text">{deliveryInsight.tasksDueSoon}</span></div>
            <div>Events next 24h: <span className="font-semibold text-settings-text">{deliveryInsight.upcomingEvents}</span></div>
          </div>
          {deliveryInsight.skipReasons.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm text-settings-text-muted">
              {deliveryInsight.skipReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <WarningCircle size={16} className="mt-0.5 shrink-0 text-settings-brand" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSection>

      {/* Master Toggle */}
      <SettingsSection title="Notification Delivery" description="Manage how and when you receive notifications.">
        <SettingsToggleRow
          title="Enable Notifications"
          description="Master switch for all Planevo notifications."
          icon={<Bell size={20} weight="fill" />}
          checked={prefs.master_toggle}
          onChange={(checked) => handleUpdate({ master_toggle: checked })}
        >
          {/* Channels */}
          <div className="mt-2 mb-2">
            <p className="text-xs font-bold text-settings-text-muted mb-3 uppercase tracking-wider">Delivery Channels</p>
            <div className="bg-settings-card border border-settings-border rounded-xl overflow-hidden shadow-sm">
              <SettingsToggleRow
                title="Mobile Push"
                description="Receive notifications on your phone."
                icon={<AppWindow size={18} weight="bold" />}
                checked={prefs.channels.push}
                onChange={(c) => handleUpdate({ channels: { ...prefs.channels, push: c } })}
              />
              <div className="h-px bg-settings-border mx-4" />
              <SettingsToggleRow
                title="Email"
                description="Receive notifications in your inbox."
                icon={<EnvelopeSimple size={18} weight="bold" />}
                checked={prefs.channels.email}
                onChange={(c) => handleUpdate({ channels: { ...prefs.channels, email: c } })}
              />
            </div>
          </div>
        </SettingsToggleRow>
      </SettingsSection>

      {/* Advanced Settings - only show if master is ON */}
      {prefs.master_toggle && (
        <>
          {/* Notification Types */}
          <SettingsSection title="Notification Types" description="Choose what we notify you about.">
            <SettingsToggleRow
              title="Daily Plan Ready"
              description="Morning nudge when your daily schedule is prepared."
              icon={<BellRinging size={18} weight="bold" />}
              checked={prefs.types.daily_plan}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, daily_plan: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Deadline Rescue"
              description="Evening reminder if you have overdue tasks due today."
              icon={<WarningCircle size={18} weight="bold" />}
              checked={prefs.types.deadline_rescue}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, deadline_rescue: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Upcoming Reminders"
              description="Morning digest for tasks due in the next few days and calendar events in the next 24 hours."
              icon={<CalendarBlank size={18} weight="bold" />}
              checked={prefs.types.upcoming_reminders}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, upcoming_reminders: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Canvas Assignments"
              description="Bundled push when new Canvas assignments sync in."
              icon={<AppWindow size={18} weight="bold" />}
              checked={prefs.types.canvas_assignments}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, canvas_assignments: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Google Calendar"
              description="Events starting soon and daily calendar digest."
              icon={<CalendarBlank size={18} weight="bold" />}
              checked={prefs.types.calendar_events}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, calendar_events: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Slack Digest"
              description="Pro: bundled updates from connected Slack workspaces."
              icon={<AppWindow size={18} weight="bold" />}
              checked={prefs.types.work_slack}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, work_slack: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Linear Digest"
              description="Pro: issue assignments and status changes."
              icon={<AppWindow size={18} weight="bold" />}
              checked={prefs.types.work_linear}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, work_linear: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Notion Digest"
              description="Pro: page updates and due dates from connected databases."
              icon={<AppWindow size={18} weight="bold" />}
              checked={prefs.types.work_notion}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, work_notion: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Weekly Review"
              description="A recap of what moved, what slipped, and what to tune next."
              icon={<CheckCircle size={18} weight="bold" />}
              checked={prefs.types.weekly_review}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, weekly_review: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Account & Security"
              description="Account updates. Password reset emails always remain available."
              icon={<WarningCircle size={18} weight="bold" />}
              checked={prefs.types.account}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, account: c } })}
            />
            <div className="h-px bg-settings-border mx-4" />
            <SettingsToggleRow
              title="Billing"
              description="Receipts, payment failures, and subscription updates."
              icon={<EnvelopeSimple size={18} weight="bold" />}
              checked={prefs.types.billing}
              onChange={(c) => handleUpdate({ types: { ...prefs.types, billing: c } })}
            />
          </SettingsSection>

          {/* Quiet Hours */}
          <SettingsSection title="Quiet Hours" description="Pause all notifications during these hours.">
            <SettingsToggleRow
              title="Enable Quiet Hours"
              description="We won't send anything between your chosen times."
              icon={<Moon size={18} weight="bold" />}
              checked={prefs.quiet_hours.enabled}
              onChange={(c) => handleUpdate({ quiet_hours: { ...prefs.quiet_hours, enabled: c } })}
            >
              <div className="bg-settings-card border border-settings-border rounded-xl p-4 mt-2 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-settings-text">From</label>
                  <input
                    type="time"
                    className="bg-settings-background border border-settings-border rounded-lg px-2 py-1.5 text-sm font-medium text-settings-text focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]"
                    value={prefs.quiet_hours.start}
                    onChange={(e) => handleUpdate({ quiet_hours: { ...prefs.quiet_hours, start: e.target.value } })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-settings-text">To</label>
                  <input
                    type="time"
                    className="bg-settings-background border border-settings-border rounded-lg px-2 py-1.5 text-sm font-medium text-settings-text focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]"
                    value={prefs.quiet_hours.end}
                    onChange={(e) => handleUpdate({ quiet_hours: { ...prefs.quiet_hours, end: e.target.value } })}
                  />
                </div>
                <div className="flex flex-col sm:ml-auto w-full sm:w-auto">
                  <select
                    className="bg-settings-background border border-settings-border rounded-lg px-2 py-1.5 text-sm font-medium text-settings-text focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)] max-w-[200px]"
                    value={prefs.quiet_hours.timezone}
                    onChange={(e) => handleUpdate({ quiet_hours: { ...prefs.quiet_hours, timezone: e.target.value } })}
                  >
                    {timezones.map(tz => <option key={tz} value={tz} className="bg-settings-background text-settings-text">{tz}</option>)}
                  </select>
                </div>
              </div>
            </SettingsToggleRow>
          </SettingsSection>

          {/* Test Delivery */}
          <SettingsSection title="Troubleshooting">
            <SettingsRow
              title="Test Push Notification"
              description="Send a test ping to your mobile device."
              icon={<PaperPlaneRight size={18} weight="bold" />}
              action={
                <button
                  onClick={handleTestPush}
                  disabled={testStatus === 'loading'}
                  className="px-4 py-2 bg-settings-background border border-settings-border rounded-lg text-sm font-bold text-settings-text hover:bg-settings-border transition-colors disabled:opacity-50"
                >
                  {testStatus === 'loading' ? 'Sending...' : 'Send Test'}
                </button>
              }
            />
            {testMessage && (
              <div className={`px-4 pb-4 flex items-center gap-2 text-sm font-medium ${testStatus === 'success' ? 'text-settings-brand' : 'text-red-500'}`}>
                {testStatus === 'success' ? <CheckCircle weight="bold" /> : <WarningCircle weight="bold" />}
                {testMessage}
              </div>
            )}
            <div className="h-px bg-settings-border mx-4" />
            <SettingsRow
              title="Test Email Notification"
              description="Send a test message to your account email."
              icon={<EnvelopeSimple size={18} weight="bold" />}
              action={
                <button
                  onClick={handleTestEmail}
                  disabled={emailTestStatus === 'loading'}
                  className="px-4 py-2 bg-settings-background border border-settings-border rounded-lg text-sm font-bold text-settings-text hover:bg-settings-border transition-colors disabled:opacity-50"
                >
                  {emailTestStatus === 'loading' ? 'Sending...' : 'Send Test'}
                </button>
              }
            />
            {emailTestMessage && (
              <div className={`px-4 pb-4 flex items-center gap-2 text-sm font-medium ${emailTestStatus === 'success' ? 'text-settings-brand' : 'text-red-500'}`}>
                {emailTestStatus === 'success' ? <CheckCircle weight="bold" /> : <WarningCircle weight="bold" />}
                {emailTestMessage}
              </div>
            )}
          </SettingsSection>
        </>
      )}
    </div>
  );
}
