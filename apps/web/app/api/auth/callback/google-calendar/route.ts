import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { encryptToken } from '@/lib/crypto';
import { getIntegrationAccount, upsertIntegrationAccount } from '@/lib/integrations/accounts';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const targetOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : new URL(request.url).origin;

  const popupHtml = (error: string | null) => `
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Complete</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage(
              { type: 'oauth_result', provider: 'google', error: ${JSON.stringify(error)} },
              ${JSON.stringify(targetOrigin)}
            );
          }
          window.close();
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body>
    </html>
  `;

  if (errorParam) {
    console.error('Google Calendar OAuth error:', errorParam);
    return new NextResponse(popupHtml(errorParam), { headers: { 'Content-Type': 'text/html' } });
  }

  if (code) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const { provider_refresh_token, user } = data.session;

      if (provider_refresh_token) {
        await upsertIntegrationAccount({
          userId: user.id,
          provider: 'google_calendar',
          refreshTokenEncrypted: encryptToken(provider_refresh_token),
          status: 'connected',
        });
      } else {
        const existing = await getIntegrationAccount(user.id, 'google_calendar');
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('google_calendar_refresh_token')
          .eq('id', user.id)
          .maybeSingle();

        if (!existing?.refresh_token_encrypted && !userRow?.google_calendar_refresh_token) {
          return new NextResponse(popupHtml('google_calendar_no_refresh_token'), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        if (!existing?.refresh_token_encrypted && userRow?.google_calendar_refresh_token) {
          const legacy = userRow.google_calendar_refresh_token;
          const encrypted = legacy.includes(':') ? legacy : encryptToken(legacy);
          await upsertIntegrationAccount({
            userId: user.id,
            provider: 'google_calendar',
            refreshTokenEncrypted: encrypted,
            status: 'connected',
          });
        } else {
          await upsertIntegrationAccount({
            userId: user.id,
            provider: 'google_calendar',
            status: 'connected',
          });
        }
      }

      const credentials = await getIntegrationAccount(user.id, 'google_calendar');
      if (!credentials?.refresh_token_encrypted) {
        return new NextResponse(popupHtml('google_calendar_no_refresh_token'), {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      await supabase
        .from('users')
        .update({ google_calendar_connected: true })
        .eq('id', user.id);

      try {
        await syncGoogleCalendar(user.id, true);
      } catch (syncError) {
        console.error('Initial Google Calendar sync after connect failed:', syncError);
      }

      return new NextResponse(popupHtml(null), { headers: { 'Content-Type': 'text/html' } });
    }
  }

  return new NextResponse(popupHtml('google_calendar_failed'), { headers: { 'Content-Type': 'text/html' } });
}
