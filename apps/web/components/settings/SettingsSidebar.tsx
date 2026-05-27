'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsSidebar({ profile }: { profile: any }) {
  const pathname = usePathname();

  const links = [
    { name: 'Profile', path: '/dashboard/settings/profile' },
    { name: 'Sources & Integrations', path: '/dashboard/settings/integrations', badge: '3 / 7' },
    { name: 'Bruno preferences', path: '/dashboard/settings/bruno' },
    { name: 'Appearance', path: '/dashboard/settings/appearance' },
    { name: 'Notifications', path: '/dashboard/settings/notifications' },
    { name: 'Membership', path: '/dashboard/settings/membership', badge: 'TRIAL · 11D' },
    { name: 'Data & privacy', path: '/dashboard/settings/privacy' },
  ];

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col gap-5">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#e6dcce] flex items-center gap-3 shadow-sm">
        <div className="w-11 h-11 bg-[#B98A61] rounded-xl flex items-center justify-center text-white font-black text-sm">
          {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'AT'}
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-[#2A2118] leading-tight text-sm truncate">
            {profile?.name || 'Anthony Tarek'}
          </h3>
          <p className="text-[9px] font-bold text-[#8a7b66] uppercase tracking-widest mt-0.5 truncate">
            {profile?.email || 'anthony@nyu.edu'}
          </p>
          <p className="text-[9px] font-bold text-[#8a7b66] uppercase tracking-widest">
            · EDU VERIFIED
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5">
        {links.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center justify-between group py-2.5 px-2 relative rounded-lg transition-colors ${
                isActive
                  ? 'text-[#2A2118]'
                  : 'text-[#4A3F32] hover:text-[#2A2118] hover:bg-white/40'
              }`}
            >
              <div className="flex items-center gap-3">
                {isActive && (
                  <div className="absolute left-[-8px] w-[3px] h-5 bg-[#D08741] rounded-r-full" />
                )}
                <span className={`text-[13px] ${isActive ? 'font-black' : 'font-semibold'}`}>{link.name}</span>
              </div>
              {link.badge && (
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-white text-[#D08741] border border-[#e6dcce] shadow-sm' 
                    : 'bg-[#E8C896] text-[#6B4423]'
                }`}>
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings/danger"
          className="py-2.5 px-2 mt-3 text-[13px] font-semibold text-[#C56B5E] hover:text-[#a05247] transition-colors"
        >
          Danger zone
        </Link>
      </nav>

      {/* Tip Card */}
      <div className="mt-auto bg-[#6B4423] text-[#F5DCB8] p-4 rounded-2xl shadow-inner">
        <div className="text-lg mb-1.5">🐻</div>
        <p className="text-[11px] font-bold leading-relaxed">
          Tip — connect <strong className="text-white">Notion</strong> and I&apos;ll add your project deadlines too.
        </p>
      </div>
    </aside>
  );
}
