"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeClosed, CaretLeft } from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import { PlanevoLogo } from "@/components/PlanevoLogo";
import { useSearchParams } from "next/navigation";
import { posthog } from "@/lib/posthog";

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

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--color-paper)] text-[var(--color-ink)] font-sans">
      {/* Left Column: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-24 xl:px-32 py-12">
        <div className="w-full max-w-[420px] mx-auto">
          {/* Back to home */}
          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] mb-12 transition-colors group"
          >
            <CaretLeft weight="bold" className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          <div className="mb-10">
            <div className="mb-8 flex items-center gap-3">
              <PlanevoLogo size={40} gapColor="var(--color-paper)" />
              <div className="flex items-baseline tracking-tight leading-none text-[var(--color-ink)] select-none">
                <span className="text-4xl font-bold font-serif">Plan</span>
                <span className="text-4xl font-serif italic">evo</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-ink)] mb-2">Create an account</h1>
            <p className="text-[var(--color-ink-soft)]">Welcome! Let&apos;s get you set up.</p>
          </div>
          
          {success ? (
            <div className="text-center py-10 px-6 rounded-2xl bg-[var(--color-cream)] border border-[var(--color-cream-2)] shadow-sm">
              <div className="text-5xl mb-6">✉️</div>
              <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-3 font-serif">Check your email</h2>
              <p className="text-[var(--color-ink-soft)] text-base">
                We sent a confirmation link to <strong className="text-[var(--color-bruno)] font-semibold">{email}</strong>.
                Click it to activate your account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-semibold text-[var(--color-ink)]">Full name</label>
                <input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--color-cream)] border border-[var(--color-cream-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-honey)] focus:border-transparent transition-all placeholder:text-[var(--color-ink-faint)]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-ink)]">Email address</label>
                <input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[var(--color-cream)] border border-[var(--color-cream-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-honey)] focus:border-transparent transition-all placeholder:text-[var(--color-ink-faint)]"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-[var(--color-ink)]">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-cream)] border border-[var(--color-cream-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-honey)] focus:border-transparent transition-all placeholder:text-[var(--color-ink-faint)]"
                    placeholder="At least 6 characters"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    className="absolute inset-y-0 right-0 flex h-full w-12 items-center justify-center text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] outline-none"
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
              </div>
              
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox 
                  id="terms" 
                  required
                  className="border-[var(--color-ink-soft)] data-[state=checked]:bg-[var(--color-ink)] data-[state=checked]:text-white rounded-[4px]" 
                />
                <label htmlFor="terms" className="text-sm font-medium text-[var(--color-ink-soft)] select-none">
                  I agree to the{" "}
                  <Link href="#" className="text-[var(--color-bruno)] hover:text-[var(--color-honey-deep)] font-semibold transition-colors">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-[var(--color-bruno)] hover:text-[var(--color-honey-deep)] font-semibold transition-colors">
                    Conditions
                  </Link>
                </label>
              </div>

              <div className="pt-4 space-y-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)] text-[var(--color-paper)] font-semibold text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create free account'}
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--color-line-strong)]" />
                  </div>
                  <div className="relative flex justify-center text-xs font-bold">
                    <span className="px-4 bg-[var(--color-paper)] text-[var(--color-ink-faint)] uppercase tracking-widest">or</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleGoogleSignup} 
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-white border border-[var(--color-line-strong)] hover:bg-gray-50 text-[var(--color-ink)] font-semibold text-base transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </form>
          )}
          
          {!success && (
            <p className="mt-10 text-center text-sm font-medium text-[var(--color-ink-soft)]">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--color-bruno)] hover:text-[var(--color-honey-deep)] font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Right Column: Hero Image */}
      <div className="hidden lg:block relative bg-[var(--color-cream-2)] overflow-hidden">
        <Image 
          src="/planevo_login_hero.png" 
          alt="Planevo Bear Organizing Tasks" 
          fill 
          priority
          className="object-cover"
        />
        {/* Soft overlay/gradient to blend it in slightly */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/5 to-transparent"></div>
      </div>
    </div>
  );
}
