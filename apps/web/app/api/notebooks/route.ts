import { NextRequest, NextResponse } from 'next/server';
import { createNotebookSchema } from '@planevo/notes-core';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureDefaultNotebooks, syncCourseNotebooks } from '@/lib/notes/noteService';

export async function GET(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data: assignments } = await supabaseAdmin
    .from('canvas_assignments')
    .select('course_name')
    .eq('user_id', user.id);

  const courses = (assignments ?? []).map((a) => a.course_name).filter(Boolean) as string[];
  await syncCourseNotebooks(supabaseAdmin, user.id, courses);
  const notebooks = await ensureDefaultNotebooks(supabaseAdmin, user.id);

  return NextResponse.json({ notebooks });
}

export async function POST(req: NextRequest) {
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const parsed = createNotebookSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid notebook payload' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('notebooks')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
      canvas_course_name: parsed.data.canvasCourseName ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create notebook' }, { status: 500 });
  }

  return NextResponse.json({ notebook: data });
}
