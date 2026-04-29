"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeClosed } from "@phosphor-icons/react";
import Link from "next/link";

export default function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

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
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground py-12">
      <div className="w-full max-w-md mx-4 mb-4">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-bold text-surface-900 hover:bg-surface-900 hover:text-surface-100 px-2 py-1 transition-colors uppercase border-2 border-transparent hover:border-surface-900"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </div>
      <div className="w-full max-w-md mx-4">
        <Card className="border-2 border-surface-900 shadow-[8px_8px_0_0_var(--shadow-color)] pb-0 bg-surface-100 text-surface-900">
          <CardHeader className="flex flex-col items-center space-y-1.5 pb-4 pt-6">
            <div className="text-surface-900 mb-2">
              <span className="text-4xl hover:scale-110 transition-transform">🌱</span>
            </div>
            <div className="space-y-0.5 flex flex-col items-center">
              <h2 className="text-2xl font-bold uppercase tracking-tight">
                Create an account
              </h2>
              <p className="text-surface-600 mt-1 font-bold">
                Welcome! Create an account to get started.
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 px-8">
            {success ? (
               <div className="text-center py-6 border-2 border-surface-900 bg-surface-200 shadow-[4px_4px_0_0_var(--shadow-color)]">
                 <div className="text-4xl mb-4">✉️</div>
                 <h2 className="text-xl font-bold text-surface-900 mb-2 uppercase">Check your email</h2>
                 <p className="text-surface-900 text-sm font-medium px-4">
                   We sent a confirmation link to <strong className="text-brand-700 bg-brand-100 px-1 border border-surface-900">{email}</strong>.
                   Click it to activate your account.
                 </p>
               </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-6">
                {error && (
                  <div className="p-3 bg-error text-surface-100 border-2 border-surface-900 font-bold text-sm shadow-[4px_4px_0_0_var(--shadow-color)]">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-bold uppercase">Full name</Label>
                  <Input 
                    id="name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="bg-surface-100 border-2 border-surface-900 focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_0_var(--shadow-color)] transition-shadow shadow-[2px_2px_0_0_var(--shadow-color)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold uppercase">Email address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="bg-surface-100 border-2 border-surface-900 focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_0_var(--shadow-color)] transition-shadow shadow-[2px_2px_0_0_var(--shadow-color)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold uppercase">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pr-10 bg-surface-100 border-2 border-surface-900 focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_0_var(--shadow-color)] transition-shadow shadow-[2px_2px_0_0_var(--shadow-color)]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-surface-900 hover:bg-surface-200 border-l-2 border-transparent hover:border-surface-900"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeClosed weight="bold" className="h-5 w-5" />
                      ) : (
                        <Eye weight="bold" className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="terms" className="border-2 border-surface-900 data-[state=checked]:bg-surface-900 data-[state=checked]:text-surface-100 shadow-[2px_2px_0_0_var(--shadow-color)]" required />
                  <label htmlFor="terms" className="text-sm font-bold text-surface-900 uppercase">
                    I agree to the{" "}
                    <Link href="#" className="text-surface-900 underline underline-offset-4 hover:bg-surface-900 hover:text-surface-100 px-1 transition-colors">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="text-surface-900 underline underline-offset-4 hover:bg-surface-900 hover:text-surface-100 px-1 transition-colors">
                      Conditions
                    </Link>
                  </label>
                </div>

                <div className="space-y-4 pt-2">
                  <Button className="w-full text-base" type="submit" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create free account'}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-surface-900" />
                    </div>
                    <div className="relative flex justify-center text-xs font-bold">
                      <span className="px-3 bg-surface-100 text-surface-900 uppercase tracking-widest border-2 border-surface-900">or</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full text-base" type="button" onClick={handleGoogleSignup} disabled={loading}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center border-t-2 border-surface-900 bg-surface-200 !py-6">
            <p className="text-center text-sm font-bold text-surface-900 uppercase">
              Already have an account?{" "}
              <Link href="/login" className="text-surface-900 hover:underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
