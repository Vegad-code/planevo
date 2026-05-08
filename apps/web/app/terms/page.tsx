// TODO (pre-launch): Replace this stub with a Termly or Iubenda generated Terms of Service.
// Sign up at https://termly.io or https://www.iubenda.com to generate a hosted policy.
// A lawyer review is NOT required before public launch — it becomes important before the
// first school B2B contract or once paid users exceed ~500.

import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Plan Pilot',
  description: 'The rules of using Plan Pilot.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-black uppercase tracking-widest text-surface-600 hover:text-surface-900 mb-12"
          data-testid="terms-back-home-link"
        >
          ← Back to Plan Pilot
        </Link>

        <div className="mb-8 inline-block bg-accent-100 border-2 border-accent-500 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-accent-700 rounded-full">
          Draft — Replace with Termly before public launch
        </div>

        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Terms of Service</h1>
        <p className="text-surface-500 font-bold uppercase tracking-widest text-xs mb-12">
          Last updated: January 2026
        </p>

        <div className="prose prose-lg max-w-none space-y-8 text-surface-700 font-medium leading-relaxed">
          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">1. Agreement</h2>
            <p>
              By using Plan Pilot you agree to these Terms. If you do not agree, please do not
              create an account. You must be at least 13 years old to use Plan Pilot.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">2. Your account</h2>
            <p>
              You are responsible for keeping your password and any connected tokens (Google,
              Canvas) secure. Tell us immediately if you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">3. Subscriptions and payment</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Plan Pilot offers a 14-day free trial. After the trial, your card is charged the monthly or annual rate you selected.</li>
              <li>You can cancel anytime from <Link href="/dashboard/settings" className="text-brand-600 underline">Settings</Link>.</li>
              <li>We do not refund partial months. Annual plans are refundable within 30 days of purchase if you have not engaged with the product.</li>
              <li>Prices are in USD. Taxes may apply based on your location.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use Plan Pilot for anything illegal.</li>
              <li>Attempt to access another user&apos;s data.</li>
              <li>Reverse engineer, scrape, or rebrand Plan Pilot.</li>
              <li>Use Ollie to generate harmful, defamatory, or copyrighted content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">5. AI output disclaimer</h2>
            <p>
              Ollie generates suggestions using a large language model. AI output may be wrong,
              incomplete, or inappropriate. Plan Pilot is not a replacement for academic advising,
              medical advice, or professional coaching. You are responsible for the work you do
              based on Ollie&apos;s suggestions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">6. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these Terms. You may delete
              your account at any time. On termination, we delete your data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">7. Liability</h2>
            <p>
              Plan Pilot is provided &quot;as is.&quot; To the maximum extent allowed by law, our liability
              is limited to the amount you paid us in the 12 months before the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">8. Changes</h2>
            <p>
              We will email you at least 30 days before any material change to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">9. Contact</h2>
            <p>
              Questions? Reach us at <a href="mailto:legal@planpilot.app" className="text-brand-600 underline">legal@planpilot.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
