'use client';

import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/database';

export interface NlpCorrectionLog {
  raw: string;
  parsed: Record<string, unknown>;
  override: Record<string, unknown>;
}

export async function logNlpCorrection(entry: NlpCorrectionLog): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('ai_feedback').insert({
      user_id: user.id,
      feature_name: 'nlp_parse',
      action: 'override',
      suggestion_json: entry as unknown as Json,
    });
  } catch {
    // Non-blocking telemetry
  }
}
