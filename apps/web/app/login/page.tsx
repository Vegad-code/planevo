"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_CALENDAR_OAUTH_SCOPES } from '@/lib/integrations/google-oauth-scopes';
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeClosed, CaretLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { AuthPanelBackdrop, DotGridLayer } from "@/components/landing-v2/DotGridSurface";
import { PlanevoLogo } from "@/components/PlanevoLogo";
import { PlanevoWordmark } from "@/components/PlanevoWordmark";
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
      body: JSON.stringify({ email, password }),
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
    <div className="relative min-h-screen grid bg-(--color-paper) text-(--color-ink) font-sans lg:grid-cols-2">
      <DotGridLayer />
      {/* Left Column: Form */}
      <div className="relative flex flex-col justify-center px-8 py-12 sm:px-16 md:px-24 lg:px-24 xl:px-32">
        <div className="w-full max-w-105 mx-auto">
          {/* Back to home */}
          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium text-(--color-ink-faint) hover:text-(--color-ink) mb-12 transition-colors group"
          >
            <CaretLeft weight="bold" className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          <div className="mb-10">
            <div className="mb-8 flex items-center gap-3">
              <PlanevoLogo size={40} gapColor="var(--color-paper)" />
              <PlanevoWordmark size="lg" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-(--color-ink) mb-2">Welcome back</h1>
            <p className="text-(--color-ink-soft)">Please enter your details to sign in.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-(--color-ink)">Email address</label>
              <input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-cream border border-(--color-cream-2) focus:outline-none focus:ring-2 focus:ring-(--color-honey) focus:border-transparent transition-all placeholder:text-(--color-ink-faint)"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-(--color-ink)">Password</label>
                <Link href="/forgot-password" className="text-sm font-medium text-bruno hover:text-(--color-honey-deep) transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  className="w-full px-4 py-3 rounded-xl bg-cream border border-(--color-cream-2) focus:outline-none focus:ring-2 focus:ring-(--color-honey) focus:border-transparent transition-all placeholder:text-(--color-ink-faint)"
                  placeholder="Enter your password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute inset-y-0 right-0 flex h-full w-12 items-center justify-center text-(--color-ink-faint) hover:text-(--color-ink) outline-none"
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
            </div>
            
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox 
                id="remember" 
                checked={rememberMe} 
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="border-(--color-ink-soft) data-[state=checked]:bg-(--color-ink) data-[state=checked]:text-white rounded-sm" 
              />
              <label htmlFor="remember" className="text-sm font-medium text-(--color-ink-soft) cursor-pointer select-none">
                Remember for 30 days
              </label>
            </div>

            <div className="pt-4 space-y-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-(--color-ink) hover:bg-(--color-ink-2) text-(--color-paper) font-semibold text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--color-ink) disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
              
              <button 
                type="button" 
                onClick={handleGoogleLogin} 
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-white border border-line-strong hover:bg-gray-50 text-(--color-ink) font-semibold text-base transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--color-ink) disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </div>
          </form>
          
          <p className="mt-10 text-center text-sm font-medium text-(--color-ink-soft)">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-bruno hover:text-(--color-honey-deep) font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <AuthPanelBackdrop />
    </div>
  );
}
