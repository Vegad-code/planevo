'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthPanelBackdrop, DotGridLayer } from '@/components/landing-v2/DotGridSurface';
import { CaretLeft } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Could not send reset email. Please try again.');
      setLoading(false);
      return;
    }

    const data = (await response.json().catch(() => ({}))) as { devResetLink?: string };
    setDevResetLink(data.devResetLink ?? null);
    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="marketing-scope relative min-h-screen grid bg-[var(--color-paper)] font-sans text-[var(--color-ink)] lg:grid-cols-2">
      <DotGridLayer />
      <div className="relative flex flex-col justify-center px-8 py-12 sm:px-16 md:px-24 lg:px-24 xl:px-32">
        <div className="w-full max-w-105 mx-auto">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-(--color-ink-faint) hover:text-(--color-ink) mb-12 transition-colors group"
            id="forgot-back-to-login"
          >
            <CaretLeft weight="bold" className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to sign in
          </Link>

          <div className="mb-10">
            <div className="mb-8 flex items-center gap-3">
              <PlanevoLogo size={40} gapColor="var(--color-paper)" />
              <PlanevoWordmark size="lg" />
            </div>

            {success ? (
              <>
                <h1 className="text-4xl font-bold tracking-tight text-(--color-ink) mb-2">Check your email</h1>
                <p className="text-(--color-ink-soft) leading-relaxed">
                  If an account exists for{' '}
                  <span className="font-semibold text-(--color-ink)">{email}</span>, we sent a password
                  reset link. Open it to choose a new password.
                </p>
                {devResetLink ? (
                  <div className="mt-6 rounded-xl border border-(--color-cream-2) bg-cream p-4 text-left">
                    <p className="mb-2 text-sm font-semibold text-(--color-ink)">
                      Local dev reset link
                    </p>
                    <p className="mb-3 text-xs text-(--color-ink-soft) leading-relaxed">
                      Use this link on this computer (the Resend dashboard preview button is not the
                      live link). Each link works once.
                    </p>
                    <a
                      href={devResetLink}
                      className="break-all text-sm font-medium text-(--color-honey-deep) underline"
                    >
                      {devResetLink}
                    </a>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold tracking-tight text-(--color-ink) mb-2">Reset password</h1>
                <p className="text-(--color-ink-soft)">
                  Enter your email and we&apos;ll send you a secure reset link.
                </p>
              </>
            )}
          </div>

          {success ? (
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl bg-(--color-ink) px-4 py-3.5 text-base font-semibold text-(--color-paper) transition-colors hover:bg-(--color-ink-2)"
            >
              Return to sign in
            </Link>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-6">
              {error && (
                <div
                  className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600"
                  id="forgot-error"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label htmlFor="forgot-email" className="block text-sm font-semibold text-(--color-ink)">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-(--color-cream-2) bg-cream px-4 py-3 transition-all placeholder:text-(--color-ink-faint) focus:border-transparent focus:outline-none focus:ring-2 focus:ring-(--color-honey)"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                id="forgot-submit-button"
                className="w-full rounded-xl bg-(--color-ink) px-4 py-3.5 text-base font-semibold text-(--color-paper) transition-colors hover:bg-(--color-ink-2) focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--color-ink) disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-10 text-center text-sm font-medium text-(--color-ink-soft)">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-semibold text-bruno transition-colors hover:text-(--color-honey-deep)"
                id="forgot-login-link"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>

      <AuthPanelBackdrop />
    </div>
  );
}
