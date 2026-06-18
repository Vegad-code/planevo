import { NextRequest, NextResponse } from 'next/server';
import type { ProIntegrationProvider } from '@/lib/integrations/types';

const COMPOSIO_PROVIDERS = new Set<string>(['notion', 'slack', 'linear']);

function resolveTargetOrigin(request: NextRequest): string {
  return new URL(request.url).origin;
}

function normalizeProvider(raw: string | null): ProIntegrationProvider | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return COMPOSIO_PROVIDERS.has(lower) ? (lower as ProIntegrationProvider) : null;
}

function resolveOAuthError(
  status: string | null,
  errorParam: string | null,
  errorDescription: string | null
): string | null {
  if (errorParam) return errorDescription || errorParam;
  if (status && status.toLowerCase() !== 'success') {
    return status;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = normalizeProvider(searchParams.get('provider'));
  const status = searchParams.get('status');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const targetOrigin = resolveTargetOrigin(request);
  const oauthError = resolveOAuthError(status, errorParam, errorDescription);

  const popupHtml = (error: string | null, resolvedProvider: string) => `
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Complete</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage(
              { type: 'oauth_result', provider: ${JSON.stringify(resolvedProvider)}, error: ${JSON.stringify(error)} },
              ${JSON.stringify(targetOrigin)}
            );
          }
          window.close();
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body>
    </html>
  `;

  if (!provider) {
    return new NextResponse(popupHtml('invalid_provider', 'unknown'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (oauthError) {
    console.error(`[composio-callback] ${provider} OAuth error:`, oauthError);
  }

  return new NextResponse(popupHtml(oauthError, provider), {
    headers: { 'Content-Type': 'text/html' },
  });
}
