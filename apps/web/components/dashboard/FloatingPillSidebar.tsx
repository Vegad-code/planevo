'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/store/ui-store';
import { useBruno } from '@/components/bruno/BrunoProvider';
import { useAppearance } from '@/components/providers/AppearanceProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Gear, SignOut, CaretLeft } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import {
  BrunoMark,
  MobileMenuButton,
  MobileOverlay,
  NAV_ITEMS,
  useSidebarProfile,
} from '@/components/dashboard/sidebar/shared';

function CollapsibleLabel({
  collapsed,
  children,
  reduceMotion,
  className = '',
}: {
  collapsed: boolean;
  children: React.ReactNode;
  reduceMotion: boolean;
  className?: string;
}) {
  if (reduceMotion) {
    if (collapsed) return null;
    return <span className={className}>{children}</span>;
  }

  return (
    <motion.span
      animate={{
        width: collapsed ? 0 : 'auto',
        opacity: collapsed ? 0 : 1,
        marginLeft: collapsed ? 0 : 12,
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`whitespace-nowrap overflow-hidden block ${className}`}
    >
      {children}
    </motion.span>
  );
}

export default function FloatingPillSidebar() {
  const pathname = usePathname();
  const { currentContext, openBruno } = useBruno();
  const { reduceMotion } = useAppearance();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { mounted, isPremium, userName, avatarUrl, planType, initials, handleLogout } =
    useSidebarProfile();

  if (!mounted) return null;

  const asideClassName = `
    fixed z-50
    flex flex-col bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-text)]
    font-sans shadow-2xl
    top-4 bottom-4 left-4 lg:top-6 lg:bottom-6 lg:left-6
    py-8 overflow-hidden transition-transform duration-300
    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-[150%]'}
    lg:translate-x-0
    ${sidebarCollapsed ? 'cursor-pointer hover:bg-[var(--color-ink-2)]' : ''}
  `;

  const asideStyle = reduceMotion
    ? {
        width: sidebarCollapsed ? 76 : 280,
        paddingLeft: sidebarCollapsed ? 8 : 24,
        paddingRight: sidebarCollapsed ? 8 : 24,
        borderRadius: sidebarCollapsed ? 38 : 32,
      }
    : undefined;

  const asideAnimate = reduceMotion
    ? undefined
    : {
        width: sidebarCollapsed ? 76 : 280,
        paddingLeft: sidebarCollapsed ? 8 : 24,
        paddingRight: sidebarCollapsed ? 8 : 24,
        borderRadius: sidebarCollapsed ? 38 : 32,
      };

  const AsideTag = reduceMotion ? 'aside' : motion.aside;

  return (
    <>
      <MobileMenuButton onOpen={() => setMobileMenuOpen(true)} />

      {reduceMotion ? (
        mobileMenuOpen && <MobileOverlay onClose={() => setMobileMenuOpen(false)} />
      ) : (
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>
      )}

      <AsideTag
        {...(reduceMotion
          ? { style: asideStyle, className: asideClassName }
          : {
              initial: false,
              animate: asideAnimate,
              transition: { duration: 0.3, ease: 'easeInOut' },
              className: asideClassName,
            })}
        onClick={sidebarCollapsed ? toggleSidebar : undefined}
      >
        <div
          className={`flex items-center pb-6 mb-6 border-b border-[rgba(251,246,234,0.08)] w-full transition-all ${
            sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-1'
          }`}
        >
          <div className="flex items-center">
            <div className="shrink-0 flex items-center justify-center">
              <PlanevoLogo size={32} gapColor="var(--color-ink)" />
            </div>
            <CollapsibleLabel
              collapsed={sidebarCollapsed}
              reduceMotion={reduceMotion}
              className="font-serif text-[24px] tracking-[-0.02em] leading-none"
            >
              <b className="font-normal">Plan</b>
              <i className="italic font-serif text-[var(--color-honey)]">evo</i>
            </CollapsibleLabel>
          </div>

          {!sidebarCollapsed && (
            reduceMotion ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidebar();
                }}
                className="hidden lg:flex items-center justify-center text-[var(--color-sidebar-text)] opacity-40 hover:opacity-100 transition-all p-1.5 rounded-full border-none bg-transparent cursor-pointer"
                title="Collapse sidebar"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                whileHover={{ opacity: 1, backgroundColor: 'rgba(251,246,234,0.05)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidebar();
                }}
                className="hidden lg:flex items-center justify-center text-[var(--color-sidebar-text)] transition-all p-1.5 rounded-full border-none bg-transparent cursor-pointer"
                title="Collapse sidebar"
              >
                <CaretLeft size={16} weight="bold" />
              </motion.button>
            )
          )}
        </div>

        {reduceMotion ? (
          !sidebarCollapsed && (
            <div className="font-mono text-[10px] tracking-[0.16em] text-[rgba(251,246,234,0.4)] px-3 uppercase whitespace-nowrap overflow-hidden mb-3">
              WORKSPACE
            </div>
          )
        ) : (
          <motion.div
            animate={{
              opacity: sidebarCollapsed ? 0 : 1,
              height: sidebarCollapsed ? 0 : 'auto',
              marginBottom: sidebarCollapsed ? 0 : 12,
            }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="font-mono text-[10px] tracking-[0.16em] text-[rgba(251,246,234,0.4)] px-3 uppercase whitespace-nowrap overflow-hidden"
          >
            WORKSPACE
          </motion.div>
        )}

        <nav className="flex flex-col gap-1 mb-8">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center px-3 py-3 rounded-full text-[14px] transition-colors relative overflow-hidden
                  ${
                    isActive
                      ? 'bg-[rgba(208,135,65,0.15)] text-[var(--color-honey)] font-medium border-none'
                      : 'text-[rgba(251,246,234,0.65)] hover:bg-[rgba(251,246,234,0.08)] hover:text-[var(--color-paper)] font-normal border border-transparent'
                  }
                  ${sidebarCollapsed ? 'justify-center w-12 h-12 mx-auto' : ''}
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span
                  className={`shrink-0 flex items-center justify-center ${
                    isActive ? 'text-[var(--color-honey)]' : 'text-[rgba(251,246,234,0.65)]'
                  }`}
                >
                  {item.icon}
                </span>

                <CollapsibleLabel collapsed={sidebarCollapsed} reduceMotion={reduceMotion}>
                  {item.label}
                </CollapsibleLabel>

                {isActive && !sidebarCollapsed && (
                  reduceMotion ? (
                    <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--color-honey)]" />
                  ) : (
                    <motion.span
                      layoutId="activeIndicator"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--color-honey)]"
                    />
                  )
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          {reduceMotion ? (
            !sidebarCollapsed && (
              <div className="bg-[rgba(251,246,234,0.03)] border border-[rgba(251,246,234,0.06)] rounded-3xl p-4 transition-all hover:bg-[rgba(251,246,234,0.05)]">
                <BrunoCardContent
                  pathname={pathname}
                  currentContext={currentContext}
                  openBruno={openBruno}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
              </div>
            )
          ) : (
            <motion.div
              animate={{
                height: sidebarCollapsed ? 0 : 'auto',
                opacity: sidebarCollapsed ? 0 : 1,
                marginTop: sidebarCollapsed ? 0 : 16,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-[rgba(251,246,234,0.03)] border border-[rgba(251,246,234,0.06)] rounded-3xl p-4 transition-all hover:bg-[rgba(251,246,234,0.05)]">
                <BrunoCardContent
                  pathname={pathname}
                  currentContext={currentContext}
                  openBruno={openBruno}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
              </div>
            </motion.div>
          )}

          <div className="pt-4 border-t border-[rgba(251,246,234,0.08)] flex flex-col gap-1.5">
            <Link
              href="/dashboard/settings"
              className={`flex items-center text-[rgba(251,246,234,0.55)] hover:text-[var(--color-paper)] transition-all overflow-hidden whitespace-nowrap
                ${
                  sidebarCollapsed
                    ? 'justify-center w-12 h-12 rounded-full hover:bg-[rgba(251,246,234,0.08)] mx-auto'
                    : 'px-3 py-2.5 text-[13px] rounded-xl hover:bg-[rgba(251,246,234,0.05)]'
                }`}
              title={sidebarCollapsed ? 'Settings' : undefined}
            >
              <div className="shrink-0 flex items-center justify-center">
                <Gear size={sidebarCollapsed ? 20 : 16} />
              </div>
              <CollapsibleLabel collapsed={sidebarCollapsed} reduceMotion={reduceMotion}>
                Settings
              </CollapsibleLabel>
            </Link>

            <button
              onClick={handleLogout}
              className={`flex items-center text-[rgba(251,246,234,0.55)] hover:text-red-400 transition-all overflow-hidden whitespace-nowrap border-none bg-transparent cursor-pointer text-left
                ${
                  sidebarCollapsed
                    ? 'justify-center w-12 h-12 rounded-full hover:bg-red-500/10 mx-auto'
                    : 'px-3 py-2.5 text-[13px] rounded-xl hover:bg-red-500/10'
                }`}
              title={sidebarCollapsed ? 'Log Out' : undefined}
            >
              <div className="shrink-0 flex items-center justify-center">
                <SignOut size={sidebarCollapsed ? 20 : 16} />
              </div>
              <CollapsibleLabel collapsed={sidebarCollapsed} reduceMotion={reduceMotion}>
                Log Out
              </CollapsibleLabel>
            </button>

            <div
              className={`flex items-center mt-2 ${
                sidebarCollapsed
                  ? 'justify-center py-2 mx-auto'
                  : 'px-3 py-2.5 bg-[rgba(251,246,234,0.02)] rounded-2xl border border-[rgba(251,246,234,0.04)]'
              }`}
            >
              <div
                className={`${
                  sidebarCollapsed ? 'w-10 h-10' : 'w-9 h-9'
                } shrink-0 rounded-full bg-[var(--color-honey)] text-[var(--color-ink)] text-[13px] font-semibold flex items-center justify-center font-mono shadow-sm overflow-hidden`}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
              </div>

              <CollapsibleLabel
                collapsed={sidebarCollapsed}
                reduceMotion={reduceMotion}
                className="flex-1 min-w-0"
              >
                <div className="text-[13px] text-[var(--color-paper)] font-medium truncate">{userName}</div>
                <div className="text-[11px] text-[rgba(251,246,234,0.4)] font-mono tracking-[0.04em] uppercase truncate mt-0.5">
                  {isPremium ? planType.replace('_', ' ') : 'Free Plan'}
                </div>
              </CollapsibleLabel>
            </div>
          </div>
        </div>
      </AsideTag>
    </>
  );
}

function BrunoCardContent({
  pathname,
  currentContext,
  openBruno,
  setMobileMenuOpen,
}: {
  pathname: string;
  currentContext: ReturnType<typeof useBruno>['currentContext'];
  openBruno: ReturnType<typeof useBruno>['openBruno'];
  setMobileMenuOpen: (open: boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <BrunoMark size={28} />
        <div>
          <div className="font-serif text-[18px] leading-none text-[var(--color-sidebar-text)]">Bruno</div>
          <div className="text-[11px] text-[rgba(251,246,234,0.6)] mt-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" />
            ready when you are
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          openBruno(
            currentContext ?? {
              source: 'sidebar',
              page: pathname,
              label: 'Current page',
            }
          );
          setMobileMenuOpen(false);
        }}
        className="w-full bg-[var(--color-paper)] text-[var(--color-ink)] border-none py-2.5 px-4 rounded-xl text-[13px] font-medium cursor-pointer flex items-center justify-between font-sans hover:bg-white transition-colors"
      >
        Ask Bruno <span className="text-[var(--color-ink-soft)] font-sans">⌘L</span>
      </button>
    </>
  );
}
