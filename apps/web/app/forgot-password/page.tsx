'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AuthShell,
  AuthField,
  AuthInput,
  AuthPrimaryButton,
  AuthErrorBanner,
  AuthFooterLink,
  authPrimaryButtonClass,
} from '@/components/auth';
import { cn } from '@/lib/utils';

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

  if (success) {
    return (
      <AuthShell
        backHref="/login"
        backLabel="Back to sign in"
        backLinkId="forgot-back-to-login"
        title="Check your email"
        subtitle={
          <>
            If an account exists for{' '}
            <span className="font-semibold text-[var(--color-ink)]">{email}</span>, we sent a
            password reset link. Open it to choose a new password.
          </>
        }
      >
        {devResetLink ? (
          <div className="mb-6 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-cream)] p-4 text-left">
            <p className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
              Local dev reset link
            </p>
            <p className="mb-3 text-xs leading-relaxed text-[var(--color-ink-soft)]">
              Use this link on this computer (the Resend dashboard preview button is not the
              live link). Each link works once.
            </p>
            <a
              href={devResetLink}
              className="break-all text-sm font-medium text-[var(--color-ocean-deep)] underline hover:text-[var(--color-ocean)]"
            >
              {devResetLink}
            </a>
          </div>
        ) : null}

        <Link
          href="/login"
          className={cn(authPrimaryButtonClass, 'inline-flex items-center justify-center')}
        >
          Return to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      backHref="/login"
      backLabel="Back to sign in"
      backLinkId="forgot-back-to-login"
      title="Reset password"
      subtitle="Enter your email and we'll send you a secure reset link."
    >
      <form onSubmit={handleReset} className="flex flex-col gap-6">
        {error ? (
          <AuthErrorBanner id="forgot-error">{error}</AuthErrorBanner>
        ) : null}

        <AuthField label="Email address" htmlFor="forgot-email">
          <AuthInput
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </AuthField>

        <AuthPrimaryButton
          loading={loading}
          loadingLabel="Sending..."
          id="forgot-submit-button"
        >
          Send reset link
        </AuthPrimaryButton>
      </form>

      <AuthFooterLink
        prompt="Remember your password?"
        href="/login"
        linkLabel="Sign in"
        id="forgot-login-link"
      />
    </AuthShell>
  );
}
