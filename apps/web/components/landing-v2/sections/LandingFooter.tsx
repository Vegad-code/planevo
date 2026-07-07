import Link from 'next/link';
import { FOOTER_COLUMNS, LEGAL_LINKS } from '@/lib/marketing/nav';
import { FooterBrandFade } from './FooterBrandFade';

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-[var(--color-paper)]">
      <div className="px-4 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pt-16 xl:px-16">
        <div className="w-full">
          <div className="grid grid-cols-2 gap-x-10 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-16 xl:gap-x-20">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <h3 className="text-[12px] font-semibold text-[var(--color-ink)]">
                  {column.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[12px] leading-snug text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-5 border-t border-[var(--color-line)] pt-8 sm:mt-16 sm:pt-10 lg:mt-20">
            <p className="max-w-3xl text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
              Built for days that change. Planevo helps students and anyone whose
              week never quite stays put — free to start, no card required.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-[12px] text-[var(--color-ink-soft)]">
                Copyright © {year} Planevo. All rights reserved.
              </p>
              <nav
                aria-label="Legal"
                className="flex flex-wrap items-center gap-x-6 gap-y-2"
              >
                {LEGAL_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-[12px] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <FooterBrandFade />
    </footer>
  );
}
