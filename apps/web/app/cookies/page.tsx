// TODO (pre-launch): Replace this stub with a Termly or Iubenda generated Cookie Policy
// + a cookie consent banner (Termly's free banner is sufficient).
// This becomes legally required when launching in the EU/UK (GDPR/PECR).

import Link from 'next/link';

export const metadata = {
  title: 'Cookie Policy — Plan Pilot',
  description: 'How Plan Pilot uses cookies.',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-black uppercase tracking-widest text-surface-600 hover:text-surface-900 mb-12"
          data-testid="cookies-back-home-link"
        >
          ← Back to Plan Pilot
        </Link>

        <div className="mb-8 inline-block bg-accent-100 border-2 border-accent-500 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-accent-700 rounded-full">
          Draft — Replace with Termly before public launch
        </div>

        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Cookie Policy</h1>
        <p className="text-surface-500 font-bold uppercase tracking-widest text-xs mb-12">
          Last updated: January 2026
        </p>

        <div className="prose prose-lg max-w-none space-y-8 text-surface-700 font-medium leading-relaxed">
          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              Plan Pilot uses cookies to keep you signed in and to understand how the product is used.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">Cookies we use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential</strong> — Supabase auth session cookies. Required to keep you logged in.</li>
              <li><strong>Analytics</strong> — PostHog (when enabled). Used to understand which features are useful so we can improve the product.</li>
              <li><strong>Payments</strong> — Stripe cookies during checkout (only on payment pages).</li>
            </ul>
            <p>We do not use advertising cookies. We do not share data with ad networks.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">Managing cookies</h2>
            <p>
              You can clear cookies at any time from your browser settings. Note that clearing
              essential cookies will sign you out of Plan Pilot.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">Contact</h2>
            <p>
              Questions? Reach us at <a href="mailto:privacy@planpilot.app" className="text-brand-600 underline">privacy@planpilot.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
