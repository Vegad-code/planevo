import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles Accept/Reject for AI Ghost Blocks.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { blockId, action } = await request.json(); // action: 'accept' | 'reject'

    if (action === 'accept') {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status: 'confirmed' })
        .eq('id', blockId)
        .eq('user_id', user.id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Block confirmed! 🚀' });
    } else {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status: 'rejected', is_deleted: true })
        .eq('id', blockId)
        .eq('user_id', user.id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Block removed.' });
    }
  } catch (error) {
    console.error('Ghost Block Action Error:', error);
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
  }
}
