import { z } from 'zod';
import { apiError, apiSuccess, withAuthClient } from '@/lib/api/route-helpers';
import { recordBrunoChatFeedbackInMemory } from '@/lib/ai/memory';

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(-1)]),
  correctionText: z.string().max(2000).optional(),
  messageSnapshot: z.string().max(50000).optional(),
  userTurnSnapshot: z.string().max(10000).optional(),
});

export const POST = withAuthClient(async ({ user, supabase, request }) => {
  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError('Invalid feedback payload', 400);
  }

  const {
    messageId,
    conversationId,
    rating,
    correctionText,
    messageSnapshot,
    userTurnSnapshot,
  } = parsed.data;

  const { data: messageRow, error: messageError } = await supabase
    .from('bruno_messages')
    .select('id, content, conversation_id, message_type')
    .eq('id', messageId)
    .eq('user_id', user.id)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (messageError || !messageRow) {
    return apiError('Message not found', 404);
  }

  if (messageRow.message_type !== 'assistant') {
    return apiError('Feedback applies to assistant messages only', 400);
  }

  const assistantText = messageSnapshot ?? messageRow.content;

  const { data: existing } = await supabase
    .from('bruno_message_feedback')
    .select('id, rating')
    .eq('user_id', user.id)
    .eq('message_id', messageId)
    .maybeSingle();

  if (existing?.rating === rating) {
    await supabase
      .from('bruno_message_feedback')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', user.id);

    return apiSuccess({ rating: null, cleared: true });
  }

  const { error: feedbackError } = await supabase.from('bruno_message_feedback').upsert(
    {
      user_id: user.id,
      message_id: messageId,
      conversation_id: conversationId,
      rating,
      correction_text: correctionText ?? null,
      message_snapshot: assistantText,
      user_turn_snapshot: userTurnSnapshot ?? null,
    },
    { onConflict: 'user_id,message_id' }
  );

  if (feedbackError) {
    return apiError('Failed to save feedback', 500);
  }

  await supabase.from('ai_feedback').insert({
    user_id: user.id,
    feature_name: 'bruno_chat',
    action: rating === 1 ? 'accept' : 'reject',
    suggestion_json: {
      message_id: messageId,
      conversation_id: conversationId,
      rating,
      message_snapshot: assistantText,
      user_turn_snapshot: userTurnSnapshot ?? null,
    },
    correction_text: correctionText ?? null,
  });

  try {
    await recordBrunoChatFeedbackInMemory(supabase, user.id, rating, {
      assistantText,
      userText: userTurnSnapshot,
    });
  } catch (memoryError) {
    console.error('[bruno-chat-feedback] memory update failed:', memoryError);
  }

  return apiSuccess({ rating, cleared: false });
});
