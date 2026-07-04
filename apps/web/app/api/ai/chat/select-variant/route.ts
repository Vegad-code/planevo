import { z } from 'zod';
import { apiError, apiSuccess, withAuthClient } from '@/lib/api/route-helpers';
import {
  activateUserVariant,
  branchRowsToChatState,
} from '@/lib/bruno/messageBranches';
import { supabaseAdmin } from '@/lib/supabase/admin';

const selectVariantSchema = z.object({
  conversationId: z.string().uuid(),
  turnKey: z.string().uuid(),
  variantIndex: z.number().int().min(0),
});

export const POST = withAuthClient(async ({ user, supabase, request }) => {
  const parsed = selectVariantSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError('Invalid select-variant payload', 400);
  }

  const { conversationId, turnKey, variantIndex } = parsed.data;

  const { data: conversation, error: conversationError } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (conversationError) {
    return apiError('Failed to verify conversation', 500);
  }
  if (!conversation) {
    return apiError('Conversation not found', 404);
  }

  try {
    const rows = await activateUserVariant(supabaseAdmin, {
      userId: user.id,
      conversationId,
      turnKey,
      variantIndex,
    });
    const { messages, variantInfoByMessageId } = branchRowsToChatState(rows);

    return apiSuccess({
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: message.parts,
        createdAt: message.createdAt.toISOString(),
        turnKey: message.turnKey,
        variantIndex: message.variantIndex,
      })),
      variantInfoByMessageId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to switch variant';
    return apiError(message, 400);
  }
});
