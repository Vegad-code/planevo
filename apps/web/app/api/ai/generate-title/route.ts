import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { checkRateLimitForUser } from '@/lib/auth/rateLimit';

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimitForUser(user.id, 'generate-title', user.email);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error, message: rateLimitResult.message },
        { status: rateLimitResult.error === 'Unauthorized' ? 401 : 429 }
      );
    }

    const body = await req.json();
    const parsedBody = requestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsedBody.error.format() }, { status: 400 });
    }

    const { message, conversationId } = parsedBody.data;

    // Verify the conversation belongs to the user
    const { data: conv, error: convError } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }

    // Generate a concise title
    const { text: generatedTitle } = await generateText({
      model: openai('gpt-5.4-nano'),
      system: 'You are an assistant that generates very short, concise titles for chat conversations. Return ONLY the title (2 to 5 words). Do not use quotation marks, punctuation, or filler words.',
      prompt: `Generate a title for a chat starting with this message:\n\n"${message}"`,
    });

    const cleanTitle = generatedTitle.trim().replace(/^["']|["']$/g, '');

    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from('chat_conversations')
      .update({ title: cleanTitle })
      .eq('id', conversationId);

    if (updateError) {
      console.error('[Generate Title] Failed to update DB:', updateError);
      return NextResponse.json({ error: 'Failed to save title' }, { status: 500 });
    }

    return NextResponse.json({ title: cleanTitle });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Generate Title] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
