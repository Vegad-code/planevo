// TODO (pre-launch): Replace this stub with a Termly or Iubenda generated Privacy Policy.
// Sign up at https://termly.io or https://www.iubenda.com, generate a hosted policy,
// and either embed their script tag here or paste the generated markdown content.
// A lawyer review is NOT required before public launch — Termly's auto-updating
// policy is sufficient until ~500 paying users or the first school B2B contract.

import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Plan Pilot',
  description: 'How Plan Pilot collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-black uppercase tracking-widest text-surface-600 hover:text-surface-900 mb-12"
          data-testid="privacy-back-home-link"
        >
          ← Back to Plan Pilot
        </Link>

        <div className="mb-8 inline-block bg-accent-100 border-2 border-accent-500 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-accent-700 rounded-full">
          Draft — Replace with Termly before public launch
        </div>

        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Privacy Policy</h1>
        <p className="text-surface-500 font-bold uppercase tracking-widest text-xs mb-12">
          Last updated: January 2026
        </p>

        <div className="prose prose-lg max-w-none space-y-8 text-surface-700 font-medium leading-relaxed">
          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">1. Who we are</h2>
            <p>
              Plan Pilot is a productivity app that helps students manage Canvas assignments,
              calendar events, and personal tasks through an AI assistant called Ollie.
              When we say &quot;we,&quot; &quot;us,&quot; or &quot;Plan Pilot,&quot; we mean the operators of this app.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">2. What we collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account info: email, name, and (if provided) avatar from Google sign-in.</li>
              <li>Tasks, goals, calendar events, and habits you create inside Plan Pilot.</li>
              <li>Canvas assignments synced via your Canvas access token (stored encrypted).</li>
              <li>Google Calendar events synced via OAuth refresh token (stored encrypted).</li>
              <li>Usage data: which features you use and how often, for product improvement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">3. How we use AI</h2>
            <p>
              Plan Pilot sends task titles, due dates, and your AI memory preferences to OpenAI
              to generate daily plans, suggestions, and chat responses. We do not send your name,
              email, or other personal identifiers in AI prompts. OpenAI does not use Plan Pilot
              data to train their models (per their API terms).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">4. Who we share data with</h2>
            <p>We use the following third-party processors:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase</strong> — database and authentication.</li>
              <li><strong>OpenAI</strong> — AI features (Daily Plan, Ollie Chat, Weekly Review).</li>
              <li><strong>Google</strong> — Calendar sync (only if you connect it).</li>
              <li><strong>Stripe</strong> — payment processing (when monetization is enabled).</li>
            </ul>
            <p>We do not sell your data to advertisers. Ever.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">5. Your rights</h2>
            <p>
              You can export your data, delete your account, and revoke any third-party connection
              at any time from <Link href="/dashboard/settings" className="text-brand-600 underline">Settings</Link>.
              For GDPR/CCPA requests, email us at <a href="mailto:privacy@planpilot.app" className="text-brand-600 underline">privacy@planpilot.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">6. Students under 18</h2>
            <p>
              Plan Pilot is intended for users age 13 and over. If you are under 18, please review
              this policy with a parent or guardian. We follow FERPA guidelines for handling
              educational records synced from Canvas, but Plan Pilot itself is not a school-issued
              service unless your institution has signed a Data Processing Agreement with us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">7. Changes to this policy</h2>
            <p>
              We will email you at least 30 days before any material change. Continued use of
              Plan Pilot after a change means you accept the new policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tight text-surface-900 mb-3">8. Contact</h2>
            <p>
              Questions? Reach us at <a href="mailto:privacy@planpilot.app" className="text-brand-600 underline">privacy@planpilot.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
