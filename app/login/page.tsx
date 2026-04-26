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
import { JSX, SVGProps } from "react";

export default function SignIn() {
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const togglePasswordVisibility = () => setIsPasswordVisible((prev) => !prev);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
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
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-md mx-4 pb-0 bg-surface-100 border-2 border-surface-900 shadow-[8px_8px_0_0_#22201e] text-surface-900">
        <CardHeader className="space-y-1 text-center mb-2 mt-4">
          <div className="flex justify-center text-surface-900 mb-4">
            <span className="text-4xl hover:scale-110 transition-transform">🌱</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight">Sign in to Plant Pilot</h2>
            <p className="text-surface-600 text-sm mt-1 font-bold">
              Welcome back! Let's get things done.
            </p>
          </div>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-error text-surface-100 border-2 border-surface-900 font-bold text-sm shadow-[4px_4px_0_0_#22201e]">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-surface-100 border-2 border-surface-900 focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_0_#22201e] transition-shadow shadow-[2px_2px_0_0_#22201e]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="password" className="font-bold uppercase">Password</Label>
                <Link href="/forgot-password" className="text-sm font-bold text-surface-900 hover:underline underline-offset-4 uppercase">
                  Reset password
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  className="pe-9 bg-surface-100 border-2 border-surface-900 focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_0_#22201e] transition-shadow shadow-[2px_2px_0_0_#22201e]"
                  placeholder="Enter your password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-surface-900 outline-none hover:bg-surface-200 border-l-2 border-transparent hover:border-surface-900"
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  aria-pressed={isPasswordVisible}
                  aria-controls="password"
                >
                  {isPasswordVisible ? (
                    <EyeClosed weight="bold" size={20} aria-hidden="true" />
                  ) : (
                    <Eye weight="bold" size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="remember" defaultChecked className="border-2 border-surface-900 data-[state=checked]:bg-surface-900 data-[state=checked]:text-surface-100 shadow-[2px_2px_0_0_#22201e]" />
              <Label htmlFor="remember" className="text-sm font-bold text-surface-900 uppercase">
                Remember me
              </Label>
            </div>

            <div className="space-y-4 pt-2">
              <Button className="w-full text-base" type="submit" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Button variant="outline" className="w-full text-base" type="button" onClick={handleGoogleLogin} disabled={loading}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>
            </div>
          </CardContent>
        </form>
        <CardFooter className="flex justify-center border-t-2 border-surface-900 bg-surface-200 !py-6">
          <p className="text-center text-sm font-bold text-surface-900 uppercase">
            New to Plant Pilot?{" "}
            <Link href="/signup" className="text-surface-900 hover:underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
