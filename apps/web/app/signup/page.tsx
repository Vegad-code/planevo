"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeClosed, CaretLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { posthog } from "@/lib/posthog";
import {
  SignupConversionShell,
  AuthField,
  AuthInput,
  AuthPrimaryButton,
  AuthGoogleButton,
  AuthErrorBanner,
  AuthFooterLink,
  AuthDivider,
  AuthTrustLine,
  authLinkClass,
  authHeadlineClass,
  authSubtitleClass,
} from "@/components/auth";

type SignupStep = "email" | "details";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-paper)]" aria-busy="true" />
      }
    >
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [step, setStep] = useState<SignupStep>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect');
  const referralCode = searchParams?.get('ref');
  const nextPath = redirect ? `/${redirect}` : '/dashboard';

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    posthog.capture('signup_started', { method: 'email' });

    const response = await fetch('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        referralCode: referralCode || undefined,
        nextPath,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    const authError = response.ok ? null : { message: payload.error || 'Sign up failed.' };

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError(null);
    posthog.capture('signup_started', { method: 'google' });
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ''}`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  function handleContinueToDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Enter a valid email address to continue.');
      return;
    }
    setStep('details');
  }

  if (success) {
    return (
      <SignupConversionShell
        backHref="/"
        backLabel="Back to Home"
        title="Check your email"
        subtitle={
          <>
            We sent a confirmation link to{' '}
            <strong className="font-semibold text-[var(--color-ocean-deep)]">{email}</strong>.
          </>
        }
      >
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-cream)] px-6 py-10 text-center shadow-sm">
          <div className="text-5xl" aria-hidden>✉️</div>
          <h2 className={authHeadlineClass}>Almost there</h2>
          <p className={authSubtitleClass}>
            Open the link in your inbox to finish setting up your account.
          </p>
        </div>
      </SignupConversionShell>
    );
  }

  if (step === 'email') {
    return (
      <SignupConversionShell
        backHref="/"
        backLabel="Back to Home"
        title="Start planning for free"
      >
        <div className="flex flex-col gap-8">
          {error ? <AuthErrorBanner>{error}</AuthErrorBanner> : null}

          <AuthGoogleButton onClick={handleGoogleSignup} disabled={loading}>
            Continue with Google
          </AuthGoogleButton>

          <AuthDivider />

          <form onSubmit={handleContinueToDetails} className="flex flex-col gap-6">
            <AuthField
              label="Email"
              htmlFor="signup-email"
              helperText="We'll send your confirmation link here."
            >
              <AuthInput
                id="signup-email"
                type="email"
                placeholder="Enter your email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                variant="box"
              />
            </AuthField>

            <AuthPrimaryButton
              type="submit"
              disabled={!isValidEmail(email) || loading}
            >
              Continue
            </AuthPrimaryButton>
          </form>

          <AuthTrustLine>No card required · Bruno proposes, you approve</AuthTrustLine>

          <AuthFooterLink
            prompt="Already have an account?"
            href="/login"
            linkLabel="Sign in"
          />
        </div>
      </SignupConversionShell>
    );
  }

  return (
    <SignupConversionShell
      backHref="/"
      backLabel="Back to Home"
      title="Almost there"
      subtitle={
        <>
          Finish setting up{' '}
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setError(null);
            }}
            className={authLinkClass}
          >
            {email}
          </button>
        </>
      }
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-6">
        {error ? <AuthErrorBanner>{error}</AuthErrorBanner> : null}

        <button
          type="button"
          onClick={() => {
            setStep('email');
            setError(null);
          }}
          className="group -mt-2 inline-flex items-center text-sm font-medium text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
        >
          <CaretLeft
            weight="bold"
            className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1"
          />
          Back
        </button>

        <AuthField label="Full name" htmlFor="name">
          <AuthInput
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            autoComplete="name"
            variant="box"
          />
        </AuthField>

        <AuthField label="Password" htmlFor="password">
          <div className="relative">
            <AuthInput
              id="password"
              placeholder="At least 6 characters"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="pr-12"
              variant="box"
            />
            <button
              className="absolute inset-y-0 right-0 flex h-full w-12 items-center justify-center text-[var(--color-ink-faint)] outline-none hover:text-[var(--color-ink)]"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              suppressHydrationWarning
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeClosed weight="bold" size={20} aria-hidden="true" />
              ) : (
                <Eye weight="bold" size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </AuthField>

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            required
            className="mt-0.5 rounded-sm border-[var(--color-ink-soft)] data-[state=checked]:bg-[var(--color-ocean)] data-[state=checked]:text-white"
          />
          <label htmlFor="terms" className="select-none text-sm font-medium text-[var(--color-ink-soft)]">
            I agree to the{" "}
            <Link href="/terms" className={authLinkClass}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className={authLinkClass}>
              Privacy Policy
            </Link>
          </label>
        </div>

        <AuthPrimaryButton loading={loading} loadingLabel="Creating account...">
          Create free account
        </AuthPrimaryButton>

        <AuthTrustLine>Free to start · Cancel anytime</AuthTrustLine>
      </form>

      <AuthFooterLink
        prompt="Already have an account?"
        href="/login"
        linkLabel="Sign in"
      />
    </SignupConversionShell>
  );
}
