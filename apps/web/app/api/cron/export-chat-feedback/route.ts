import { NextResponse } from 'next/server';

import { withCron } from '@/lib/api/route-helpers';
import { logger } from '@/lib/logger';

type TrainingExportLine = {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  rating: 1 | -1;
  correction_text: string | null;
  message_id: string;
  conversation_id: string;
  created_at: string;
};

/**
 * GET /api/cron/export-chat-feedback
 * Exports unexported Bruno chat feedback as JSONL to private storage.
 */
export const GET = withCron(async ({ supabase }) => {
  const { data: rows, error } = await supabase
    .from('bruno_message_feedback')
    .select(
      'id, user_id, message_id, conversation_id, rating, correction_text, message_snapshot, user_turn_snapshot, created_at'
    )
    .is('exported_for_training_at', null)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    logger.error('export-chat-feedback fetch failed', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ exported: 0, path: null });
  }

  const lines: TrainingExportLine[] = rows
    .filter((row) => row.message_snapshot)
    .map((row) => {
      const messages: TrainingExportLine['messages'] = [];
      if (row.user_turn_snapshot) {
        messages.push({ role: 'user', content: row.user_turn_snapshot });
      }
      messages.push({ role: 'assistant', content: row.message_snapshot ?? '' });
      return {
        messages,
        rating: row.rating as 1 | -1,
        correction_text: row.correction_text,
        message_id: row.message_id,
        conversation_id: row.conversation_id,
        created_at: row.created_at,
      };
    });

  const jsonl = lines.map((line) => JSON.stringify(line)).join('\n');
  const batchId = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `bruno-chat/${batchId}.jsonl`;

  const { error: uploadError } = await supabase.storage
    .from('training-exports')
    .upload(path, jsonl, {
      contentType: 'application/jsonl',
      upsert: false,
    });

  if (uploadError) {
    logger.error('export-chat-feedback upload failed', { error: uploadError.message });
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const exportedAt = new Date().toISOString();
  const ids = rows.map((row) => row.id);

  const { error: markError } = await supabase
    .from('bruno_message_feedback')
    .update({ exported_for_training_at: exportedAt })
    .in('id', ids);

  if (markError) {
    logger.error('export-chat-feedback mark exported failed', {
      error: markError.message,
    });
    return NextResponse.json({ error: markError.message }, { status: 500 });
  }

  return NextResponse.json({
    exported: lines.length,
    path,
    batchId,
  });
});
