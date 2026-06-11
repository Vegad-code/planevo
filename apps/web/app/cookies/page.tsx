import Link from 'next/link';

export const metadata = {
  title: 'Cookie Policy — Planevo',
  description: 'How Planevo uses cookies.',
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
          ← Back to Planevo
        </Link>



        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Cookie Policy</h1>
        <p className="text-surface-500 font-bold uppercase tracking-widest text-xs mb-12">
          Last updated: January 2026
        </p>

        <div className="prose prose-lg max-w-none space-y-8 text-surface-700 font-medium leading-relaxed">
          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              Planevo uses cookies to keep you signed in and to understand how the product is used.
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
              essential cookies will sign you out of Planevo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">Contact</h2>
            <p>
              Questions? Reach us at <a href="mailto:privacy@planevo.co" className="text-brand-600 underline">privacy@planevo.co</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
