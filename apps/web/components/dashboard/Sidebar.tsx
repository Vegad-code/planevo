'use client';

import { useAppearance } from '@/components/providers/AppearanceProvider';
import RectangularSidebar from '@/components/dashboard/RectangularSidebar';
import FloatingPillSidebar from '@/components/dashboard/FloatingPillSidebar';
import GlassSidebar from '@/components/dashboard/GlassSidebar';

export default function Sidebar() {
  const { sidebarStyle } = useAppearance();

  if (sidebarStyle === 'floating') {
    return <FloatingPillSidebar />;
  }

  if (sidebarStyle === 'glass') {
    return <GlassSidebar />;
  }

  return <RectangularSidebar />;
}
