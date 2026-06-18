import { supabaseAdmin } from '@/lib/supabase/admin';

export type DeleteConversationResult =
  | { ok: true; id: string }
  | { ok: false; status: 404 | 500; error: string };

/**
 * Hard-deletes a chat conversation and its messages (via FK cascade).
 * Anonymizes related bruno_route_events rows to preserve aggregate analytics
 * without retaining conversation linkage.
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<DeleteConversationResult> {
  const { data: conv, error: convError } = await supabaseAdmin
    .from('chat_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  if (convError || !conv) {
    return { ok: false, status: 404, error: 'Conversation not found or unauthorized' };
  }

  const { error: anonymizeError } = await supabaseAdmin
    .from('bruno_route_events')
    .update({ conversation_id: null, message_id: null })
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);

  if (anonymizeError) {
    console.error('[Delete Conversation] Failed to anonymize route events:', anonymizeError);
    return { ok: false, status: 500, error: 'Failed to delete conversation' };
  }

  const { data: deleted, error: deleteError } = await supabaseAdmin
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select('id');

  if (deleteError) {
    console.error('[Delete Conversation] Failed to delete conversation:', deleteError);
    return { ok: false, status: 500, error: 'Failed to delete conversation' };
  }

  if (!deleted?.length) {
    return { ok: false, status: 404, error: 'Conversation not found or unauthorized' };
  }

  return { ok: true, id: conversationId };
}
