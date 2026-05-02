import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard/settings';

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      const { provider_token, provider_refresh_token, user } = data.session;

      // Persist the Google Refresh Token so we can sync offline
      if (provider_refresh_token) {
        await supabase
          .from('users')
          .update({
            google_calendar_refresh_token: provider_refresh_token,
            google_calendar_connected: true
          })
          .eq('id', user.id);
      }

      // If we only got an access token (no refresh token), we can still mark as connected
      // but sync will only work while the session is alive.
      // Usually prompt=consent ensures we get a refresh token.
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong
  return NextResponse.redirect(`${origin}/dashboard/settings?error=google_calendar_failed`);
}
