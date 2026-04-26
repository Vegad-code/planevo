'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import { useState, useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar state (using a simple approach; could use context)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        setSidebarCollapsed(sidebar.classList.contains('w-[68px]'));
      }
    });

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-surface-900">
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <main
        className={`
          transition-all duration-300 ease-in-out
          lg:ml-[240px] min-h-screen
          ${sidebarCollapsed ? 'lg:ml-[68px]' : ''}
        `}
      >
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
