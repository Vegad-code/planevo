'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PlanevoLogo } from '@/components/PlanevoLogo';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)] px-4 text-[var(--color-ink)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-line-strong)] bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <PlanevoLogo size={36} gapColor="#fff" />
          <div className="flex items-baseline tracking-tight leading-none">
            <span className="text-3xl font-bold font-serif">Plan</span>
            <span className="text-3xl font-serif italic">evo</span>
          </div>
        </div>

        {success ? (
          <div>
            <h1 className="mb-3 text-2xl font-bold">Password updated</h1>
            <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
              Your password has been changed. You can keep going from the dashboard.
            </p>
            <Link
              href="/dashboard"
              className="block w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 text-center font-semibold text-[var(--color-paper)] transition-colors hover:bg-[var(--color-ink-2)]"
            >
              Open dashboard
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold">Choose a new password</h1>
            <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
              Enter a fresh password for your Planevo account.
            </p>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-[var(--color-cream-2)] bg-[var(--color-cream)] px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-[var(--color-honey)]"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-[var(--color-cream-2)] bg-[var(--color-cream)] px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-[var(--color-honey)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 font-semibold text-[var(--color-paper)] transition-colors hover:bg-[var(--color-ink-2)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
