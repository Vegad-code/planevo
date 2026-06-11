'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrunoBubble from '@/components/bruno/BrunoBubble';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
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

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900" />
        <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[400px] bg-brand-600/8 rounded-full blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="mb-8 animate-fade-in">
        <Link href="/" className="flex items-center gap-2 group" id="forgot-logo-link">
          <span className="text-2xl">🦉</span>
          <span className="text-xl font-bold text-white group-hover:text-brand-400 transition-colors">
            Planevo
          </span>
        </Link>
      </div>

      {/* Bruno message */}
      <div className="mb-6 animate-fade-in-up">
        <BrunoBubble
          message="No worries — happens to the best of us. Let's get you back in."
          mood="gentle"
          size="md"
        />
      </div>

      {/* Reset card */}
      <div className="w-full max-w-md glass rounded-2xl p-8 animate-fade-in-up">
        {success ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-white mb-2">Reset link sent</h2>
            <p className="text-slate-400 text-sm">
              Check <strong className="text-white">{email}</strong> for a password reset link.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
              id="forgot-back-to-login"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Reset password</h1>
            <p className="text-slate-400 text-sm mb-6">
              Enter your email and we&apos;ll send a reset link.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm" id="forgot-error">
                {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-surface-700 border border-surface-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                id="forgot-submit-button"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors" id="forgot-login-link">
                ← Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
