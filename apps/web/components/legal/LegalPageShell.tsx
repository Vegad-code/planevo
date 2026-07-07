import Link from 'next/link';
import type { ReactNode } from 'react';
import { LegalBackToTop } from '@/components/legal/LegalBackToTop';

interface LegalPageShellProps {
  title: string;
  lastUpdated: string;
  backLinkTestId?: string;
  children: ReactNode;
}

/**
 * Shared shell for the public legal pages (/terms, /privacy, /cookies).
 * Keeps the back link, title, "last updated" line, and prose wrapper identical
 * across every legal document so copy changes stay in the page files.
 */
export function LegalPageShell({ title, lastUpdated, backLinkTestId, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-black uppercase tracking-widest text-surface-600 hover:text-surface-900 mb-12"
          data-testid={backLinkTestId}
        >
          ← Back to Planevo
        </Link>

        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">{title}</h1>
        <p className="text-surface-500 font-bold uppercase tracking-widest text-xs mb-12">
          Last updated: {lastUpdated}
        </p>

        <div className="prose prose-lg max-w-none space-y-8 text-surface-700 font-medium leading-relaxed">
          {children}
        </div>
      </div>
      <LegalBackToTop />
    </div>
  );
}

interface LegalSectionProps {
  id?: string;
  heading: string;
  children: ReactNode;
}

export function LegalSection({ id, heading, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">{heading}</h2>
      {children}
    </section>
  );
}

export function LegalSubheading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-lg font-black uppercase tracking-tight text-surface-800 mt-6 mb-2 scroll-mt-24">{children}</h3>
  );
}
