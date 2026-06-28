'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncCanvasIntegrationAction } from '@/lib/canvas/actions';
import { syncGoogleCalendar } from '@/lib/integrations/google-calendar';
import { syncComposioProvider } from '@/lib/integrations/composio/syncEngine';
import type { ProIntegrationProvider } from '@/lib/integrations/types';
import type { SourceProvider } from '@/lib/plan/source-items';

type ActionResult = { success: true } | { success: false; error: string };

const COMPOSIO_PROVIDERS = new Set<ProIntegrationProvider>(['notion', 'slack', 'linear']);

export async function refreshSourceAction(
  provider: SourceProvider
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    switch (provider) {
      case 'canvas':
        await syncCanvasIntegrationAction(true);
        break;
      case 'google_calendar':
        await syncGoogleCalendar(user.id, true);
        break;
      case 'notion':
      case 'slack':
      case 'linear':
        if (!COMPOSIO_PROVIDERS.has(provider)) {
          return { success: false, error: 'Unknown provider' };
        }
        await syncComposioProvider(user.id, provider);
        break;
      default: {
        const _exhaustive: never = provider;
        return { success: false, error: `Unsupported provider: ${_exhaustive}` };
      }
    }

    revalidatePath('/dashboard/daily-plan');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Sync failed',
    };
  }
}
