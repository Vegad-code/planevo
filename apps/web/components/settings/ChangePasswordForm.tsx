'use client';

import { useState } from 'react';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      setSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      setSaving(false);
      return;
    }

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage({ type: 'error', text: data.error || 'Could not change password.' });
      setSaving(false);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage({
      type: 'success',
      text: 'Password updated. We sent a confirmation email to your inbox.',
    });
    setSaving(false);
  };

  return (
    <SettingsSection
      title="Change Password"
      description="Update your password. You will receive an email when it changes."
      onSubmit={handleSubmit}
      defaultOpen={false}
    >
      <div className="flex flex-col gap-0">
        <SettingsRow
          title="Current password"
          description="Enter your existing password to confirm it is you."
        >
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-settings-border bg-settings-bg p-3 text-sm font-medium text-settings-text outline-none transition-all focus:ring-2 focus:ring-settings-brand"
          />
        </SettingsRow>

        <SettingsRow
          title="New password"
          description="At least 8 characters."
        >
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-settings-border bg-settings-bg p-3 text-sm font-medium text-settings-text outline-none transition-all focus:ring-2 focus:ring-settings-brand"
          />
        </SettingsRow>

        <SettingsRow
          title="Confirm new password"
          description="Re-enter your new password."
        >
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-settings-border bg-settings-bg p-3 text-sm font-medium text-settings-text outline-none transition-all focus:ring-2 focus:ring-settings-brand"
          />
        </SettingsRow>

        <SectionBottomActions message={message}>
          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="px-6 py-2.5 bg-settings-brand text-settings-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving ? 'Updating...' : 'Update password'}
          </button>
        </SectionBottomActions>
      </div>
    </SettingsSection>
  );
}

function userHasEmailPassword(provider: string | undefined, identities: { provider: string }[] | undefined): boolean {
  const hasEmailIdentity = identities?.some((identity) => identity.provider === 'email') ?? false;
  return hasEmailIdentity || provider === 'email';
}

export function ChangePasswordSection({
  provider,
  identities,
}: {
  provider?: string;
  identities?: { provider: string }[];
}) {
  if (!userHasEmailPassword(provider, identities)) {
    return (
      <SettingsSection
        title="Change Password"
        description="Your account uses Google sign-in."
        defaultOpen={false}
      >
        <p className="text-sm font-medium text-settings-text-muted">
          You sign in with Google, so there is no Planevo password to change here. To add a password,
          use forgot password on the login page with your account email.
        </p>
      </SettingsSection>
    );
  }

  return <ChangePasswordForm />;
}
