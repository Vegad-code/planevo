import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const next = searchParams.get('next') ?? '/dashboard/settings/integrations';

  const popupHtml = (error: string | null) => `
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Complete</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_result', provider: 'notion', error: ${error ? `'${error}'` : 'null'} }, '*');
          }
          window.close();
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body>
    </html>
  `;

  if (error) {
    console.error('Notion OAuth Error:', error);
    return new NextResponse(popupHtml(error), { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code) {
    return new NextResponse(popupHtml('no_code'), { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const clientId = process.env.NEXT_PUBLIC_NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/callback/notion`;

    if (!clientId || !clientSecret) {
      throw new Error('Missing Notion client credentials');
    }

    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Notion token error:', data);
      throw new Error(data.error || 'Failed to exchange Notion token');
    }

    const { access_token, workspace_id, workspace_name, owner } = data;

    const encryptedToken = encryptToken(access_token);

    const { data: existing } = await supabase
      .from('integration_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'notion')
      .eq('provider_account_id', workspace_id)
      .maybeSingle();

    let dbError = null;

    if (existing) {
      const { error } = await supabase.from('integration_accounts').update({
        display_name: workspace_name || 'Notion Workspace',
        access_token_encrypted: encryptedToken,
        status: 'connected',
        metadata: { owner },
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
      dbError = error;
    } else {
      const { error } = await supabase.from('integration_accounts').insert({
        user_id: user.id,
        provider: 'notion',
        provider_account_id: workspace_id,
        display_name: workspace_name || 'Notion Workspace',
        access_token_encrypted: encryptedToken,
        status: 'connected',
        metadata: { owner }
      });
      dbError = error;
    }

    if (dbError) {
      console.error('Supabase db error:', dbError);
      throw dbError;
    }

    return new NextResponse(popupHtml(null), { headers: { 'Content-Type': 'text/html' } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Notion OAuth exception:', err);
    return new NextResponse(popupHtml('server_error'), { headers: { 'Content-Type': 'text/html' } });
  }
}
