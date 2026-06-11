import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nextUrl = new URL('/dashboard/settings/integrations', request.url);

  const popupHtml = (error: string | null) => `
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Complete</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_result', provider: 'linear', error: ${error ? `'${error}'` : 'null'} }, '*');
          }
          window.close();
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body>
    </html>
  `;

  if (error) {
    console.error('Linear OAuth error:', error);
    return new NextResponse(popupHtml('linear_oauth_failed'), { headers: { 'Content-Type': 'text/html' } });
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
    const clientId = process.env.NEXT_PUBLIC_LINEAR_CLIENT_ID;
    const clientSecret = process.env.LINEAR_CLIENT_SECRET;
    const redirectUri = `${new URL(request.url).origin}/api/auth/callback/linear`;

    if (!clientId || !clientSecret) {
      throw new Error('Missing Linear credentials');
    }

    const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Linear token exchange error:', tokenData);
      throw new Error(tokenData.error_description || 'Failed to exchange token');
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    // Fetch user info from Linear
    const viewerResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query {
            viewer {
              id
              name
              email
              organization {
                id
                name
              }
            }
          }
        `
      })
    });

    const viewerData = await viewerResponse.json();
    if (viewerData.errors) {
      throw new Error('Failed to fetch Linear user data');
    }

    const viewer = viewerData.data.viewer;
    const encryptedAccessToken = encryptToken(accessToken);

    const providerAccountId = viewer.id;
    const displayName = `${viewer.organization.name} (Linear)`;

    // Save to integration_accounts safely
    const { data: existing } = await supabase
      .from('integration_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'linear')
      .maybeSingle();

    if (existing) {
      await supabase.from('integration_accounts').update({
        provider_account_id: providerAccountId,
        display_name: displayName,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: null,
        scopes: ['read'],
        status: 'connected',
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      await supabase.from('integration_accounts').insert({
        user_id: user.id,
        provider: 'linear',
        provider_account_id: providerAccountId,
        display_name: displayName,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: null,
        scopes: ['read'],
        status: 'connected'
      });
    }

    return new NextResponse(popupHtml(null), { headers: { 'Content-Type': 'text/html' } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Linear integration error:', err);
    return new NextResponse(popupHtml('linear_integration_failed'), { headers: { 'Content-Type': 'text/html' } });
  }
}
