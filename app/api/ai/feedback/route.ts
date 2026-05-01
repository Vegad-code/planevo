import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feature_name, suggestion_json, action, correction_text } = await request.json();

    if (!feature_name || !suggestion_json || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        feature_name,
        suggestion_json,
        action,
        correction_text: correction_text || null,
      });

    if (error) {
      console.error('Error logging AI feedback:', error);
      return NextResponse.json({ error: 'Failed to log feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in feedback route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
