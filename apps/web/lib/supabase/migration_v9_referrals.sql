-- Migration v9: Referral system
-- Adds referral tracking columns and the referrals table

-- Add referral columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Referral events log
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_referral_code
  ON public.users (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals (referrer_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_pair
  ON public.referrals (referrer_id, referred_id);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can read their own referrals (as referrer)
CREATE POLICY "Users can read own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Users can read referrals where they were referred
CREATE POLICY "Users can read referrals as referred" ON public.referrals
  FOR SELECT USING (auth.uid() = referred_id);
