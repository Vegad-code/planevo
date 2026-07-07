"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_CALENDAR_OAUTH_SCOPES } from '@/lib/integrations/google-oauth-scopes';
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeClosed } from "@phosphor-icons/react";
import Link from "next/link";
import {
  AuthShell,
  AuthField,
  AuthInput,
  AuthPrimaryButton,
  AuthGoogleButton,
  AuthErrorBanner,
  AuthFooterLink,
  AuthDivider,
  authLinkClass,
} from "@/components/auth";

export default function SignIn() {
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const togglePasswordVisibility = () => setIsPasswordVisible((prev) => !prev);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { error: { message: payload.error || 'Sign in failed.' } };
      }
      return { error: null };
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account consent',
        },
        scopes: GOOGLE_CALENDAR_OAUTH_SCOPES,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      backHref="/"
      backLabel="Back to Home"
      title="Welcome back"
      subtitle="Sign in to your planner."
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-6">
        {error ? <AuthErrorBanner>{error}</AuthErrorBanner> : null}

        <AuthGoogleButton onClick={handleGoogleLogin} disabled={loading}>
          Continue with Google
        </AuthGoogleButton>

        <AuthDivider />

        <AuthField label="Email address" htmlFor="email">
          <AuthInput
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </AuthField>

        <AuthField
          label="Password"
          htmlFor="password"
          labelExtra={
            <Link href="/forgot-password" className={authLinkClass}>
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <AuthInput
              id="password"
              placeholder="Enter your password"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-12"
            />
            <button
              className="absolute inset-y-0 right-0 flex h-full w-12 items-center justify-center text-[var(--color-ink-faint)] outline-none hover:text-[var(--color-ink)]"
              type="button"
              onClick={togglePasswordVisibility}
              suppressHydrationWarning
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? (
                <EyeClosed weight="bold" size={20} aria-hidden="true" />
              ) : (
                <Eye weight="bold" size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </AuthField>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            className="rounded-sm border-[var(--color-ink-soft)] data-[state=checked]:bg-[var(--color-ocean)] data-[state=checked]:text-white"
          />
          <label htmlFor="remember" className="cursor-pointer select-none text-sm font-medium text-[var(--color-ink-soft)]">
            Remember for 30 days
          </label>
        </div>

        <AuthPrimaryButton loading={loading} loadingLabel="Signing In...">
          Sign In
        </AuthPrimaryButton>
      </form>

      <AuthFooterLink
        prompt="Don't have an account?"
        href="/signup"
        linkLabel="Sign up"
      />
    </AuthShell>
  );
}
