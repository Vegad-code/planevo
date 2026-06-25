'use client';

import { useAppearance } from '@/components/providers/AppearanceProvider';
import RectangularSidebar from '@/components/dashboard/RectangularSidebar';
import FloatingPillSidebar from '@/components/dashboard/FloatingPillSidebar';

export default function Sidebar() {
  const { sidebarStyle } = useAppearance();

  if (sidebarStyle === 'floating') {
    return <FloatingPillSidebar />;
  }

  return <RectangularSidebar />;
}
