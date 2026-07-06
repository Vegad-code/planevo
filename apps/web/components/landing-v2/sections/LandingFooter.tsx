import Link from 'next/link';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Product',
    links: [
      { label: 'Capture', href: '#capture' },
      { label: 'Command board', href: '#board' },
      { label: 'Plan my day', href: '#plan' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'For you',
    links: [
      { label: 'Students', href: '/signup' },
      { label: 'High-performers', href: '/signup' },
      { label: 'Everything else', href: '#everything-else' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] px-6 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand column */}
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-[var(--color-ink)]">
            <PlanevoLogo size={22} />
            <PlanevoWordmark size="sm" />
          </div>
          <p className="max-w-[220px] text-xs leading-relaxed text-[var(--color-ink-soft)]">
            Say everything. We&rsquo;ll find the time — planned around your real
            availability.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title} className="flex flex-col items-start gap-4">
            <h3 className="text-[13px] text-[var(--color-ink-soft)]">
              {column.title}
            </h3>
            {column.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center">
        <p className="text-[13px] text-[var(--color-ink-soft)]">
          © {new Date().getFullYear()} Planevo. All rights reserved.
        </p>
        <p className="text-[13px] text-[var(--color-ink-soft)]">
          Built for days that change.
        </p>
      </div>
    </footer>
  );
}
