'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { settingsRegistry } from '@/lib/settings/registry';

export default function SettingsSidebar({ profile, badges }: { profile: Record<string, any> | null, badges?: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-60 flex-shrink-0 flex flex-col gap-5">
      {/* Profile Card */}
      <div className="bg-settings-card rounded-2xl p-4 border border-settings-border flex items-center gap-3 shadow-sm">
        <div className="w-11 h-11 bg-settings-brand rounded-xl flex items-center justify-center text-white font-black text-sm">
          {(() => {
            const displayName = profile?.preferred_name || profile?.name || 'User';
            const parts = displayName.split(' ').filter(Boolean);
            if (parts.length > 1) {
              return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return displayName.substring(0, 2).toUpperCase();
          })()}
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-settings-text leading-tight text-sm truncate">
            {profile?.preferred_name || profile?.name || 'User'}
          </h3>
          <p className="text-[9px] font-bold text-settings-text-muted uppercase tracking-widest mt-0.5 truncate">
            {profile?.email || 'Unknown Email'}
          </p>
          <p className="text-[9px] font-bold text-settings-text-muted uppercase tracking-widest">
            · EDU VERIFIED
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-row md:flex-col gap-2 md:gap-0.5 overflow-x-auto hidden-scrollbar pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
        {settingsRegistry.map((link) => {
          const isActive = pathname === link.path;
          const badge = badges?.[link.id];
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center justify-between group py-2 px-3 md:py-2.5 md:px-2 relative rounded-lg md:rounded-lg transition-colors whitespace-nowrap shrink-0 border md:border-transparent ${
                isActive
                  ? 'bg-settings-text text-settings-bg md:bg-transparent md:text-settings-text border-settings-text'
                  : 'text-settings-text-muted hover:text-settings-text hover:bg-settings-card border-settings-border bg-settings-card md:bg-transparent'
              }`}
            >
              <div className="flex items-center gap-2 md:gap-3">
                {isActive && (
                  <div className="hidden md:block absolute left-[-8px] w-[3px] h-5 bg-settings-brand rounded-r-full" />
                )}
                <span className={`text-[13px] ${isActive ? 'font-black' : 'font-semibold'}`}>{link.name}</span>
              </div>
              {badge && (
                <span className={`ml-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-settings-bg text-settings-brand border-settings-border' 
                    : 'bg-settings-card-hover text-settings-text-muted border-settings-border border'
                }`}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings/danger"
          className="shrink-0 flex items-center justify-center py-2 px-3 md:py-2.5 md:px-2 md:mt-3 text-[13px] font-semibold text-[var(--color-rose)] hover:opacity-80 transition-opacity bg-settings-card md:bg-transparent border border-settings-border md:border-transparent rounded-lg md:rounded-none"
        >
          Danger zone
        </Link>
      </nav>

    </aside>
  );
}
