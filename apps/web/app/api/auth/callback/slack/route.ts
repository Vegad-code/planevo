import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const nextUrl = new URL('/dashboard/settings/integrations', request.url);

  const popupHtml = (error: string | null) => `
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Complete</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_result', provider: 'slack', error: ${error ? `'${error}'` : 'null'} }, '*');
          }
          window.close();
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body>
    </html>
  `;

  if (error) {
    console.error('Slack OAuth error:', error);
    return new NextResponse(popupHtml('slack_oauth_failed'), { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code) {
    return new NextResponse(popupHtml('no_code'), { headers: { 'Content-Type': 'text/html' } });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(popupHtml('unauthorized'), { headers: { 'Content-Type': 'text/html' } });
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('plan_type')
    .eq('id', user.id)
    .single();

  if (!userProfile || ['free', 'canceled'].includes(userProfile.plan_type || 'free')) {
    return new NextResponse(popupHtml('requires_pro_plan'), { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${new URL(request.url).origin}/api/auth/callback/slack`;

    if (!clientId || !clientSecret) {
      throw new Error('Missing Slack credentials');
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('Slack token exchange error:', tokenData);
      throw new Error(tokenData.error || 'Failed to exchange token');
    }

    // Token data includes:
    // access_token, authed_user: { id, access_token }, team: { id, name }
    // Note: For user tokens (stars:read), we need the authed_user.access_token

    const userAccessToken = tokenData.authed_user?.access_token;
    const slackUserId = tokenData.authed_user?.id;
    const teamId = tokenData.team?.id;
    const teamName = tokenData.team?.name;

    if (!userAccessToken || !slackUserId) {
      throw new Error('No user access token received');
    }

    const encryptedAccessToken = encryptToken(userAccessToken);

    const providerAccountId = `${teamId}-${slackUserId}`;
    const displayName = `${teamName} (Slack)`;

    // Save to integration_accounts safely
    const { data: existing } = await supabase
      .from('integration_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'slack')
      .maybeSingle();

    if (existing) {
      await supabase.from('integration_accounts').update({
        provider_account_id: providerAccountId,
        display_name: displayName,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: null,
        scopes: ['stars:read'],
        status: 'connected',
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      await supabase.from('integration_accounts').insert({
        user_id: user.id,
        provider: 'slack',
        provider_account_id: providerAccountId,
        display_name: displayName,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: null,
        scopes: ['stars:read'],
        status: 'connected'
      });
    }

    return new NextResponse(popupHtml(null), { headers: { 'Content-Type': 'text/html' } });
  } catch (err: any) {
    console.error('Slack integration error:', err);
    return new NextResponse(popupHtml('slack_integration_failed'), { headers: { 'Content-Type': 'text/html' } });
  }
}
