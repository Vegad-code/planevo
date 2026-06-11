import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncSlackAction } from '@/lib/integrations/slack';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await syncSlackAction(user.id);
    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully.',
      count
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Slack sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
