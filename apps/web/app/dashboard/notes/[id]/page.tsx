'use client';

import React, { Suspense } from 'react';
import { NoteDetailView } from '@/components/notes/NoteDetailView';
import { useRegisterBrunoContext } from '@/components/bruno/BrunoProvider';

function NoteDetailContent({ noteId }: { noteId: string }) {
  useRegisterBrunoContext({
    source: 'dashboard',
    page: `/dashboard/notes/${noteId}`,
    label: 'Note',
  });
  return <NoteDetailView noteId={noteId} />;
}

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <NoteDetailPageInner params={params} />
    </Suspense>
  );
}

function NoteDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  return <NoteDetailContent noteId={id} />;
}
