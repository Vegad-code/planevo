'use client';

import { NotesHub } from '@/components/notes/NotesHub';
import { useRegisterBrunoContext } from '@/components/bruno/BrunoProvider';

export default function NotesPage() {
  useRegisterBrunoContext({
    source: 'dashboard',
    page: '/dashboard/notes',
    label: 'Notes',
  });

  return <NotesHub />;
}
