import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveNotionDatabases } from '@/lib/integrations/notion';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { selectedDatabaseIds } = await request.json();
    if (!Array.isArray(selectedDatabaseIds)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    await saveNotionDatabases(user.id, selectedDatabaseIds);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save Notion databases error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
