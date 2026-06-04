import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchNotionDatabases } from '@/lib/integrations/notion';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const databases = await fetchNotionDatabases(user.id);
    return NextResponse.json({ success: true, databases });
  } catch (error: any) {
    console.error('Fetch Notion databases error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
