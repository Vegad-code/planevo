'use client';

import EnhancedTasks from '@/components/tasks/EnhancedTasks';
import { useRegisterBrunoContext } from '@/components/bruno/BrunoProvider';

export default function TasksPage() {
  useRegisterBrunoContext({
    source: 'tasks',
    page: '/dashboard/tasks',
    label: 'Tasks',
  });

  return <EnhancedTasks />;
}
