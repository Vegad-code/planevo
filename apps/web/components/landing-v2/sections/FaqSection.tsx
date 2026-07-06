import { ScrollReveal } from '../motion/ScrollReveal';

export const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What is Planevo Command?',
    a: 'Command is the home screen of Planevo: one capture box and one calm board. You dump everything on your plate — typed, pasted, or spoken — and Planevo turns it into real responsibilities sorted by when they actually matter.',
  },
  {
    q: 'Does it read my Canvas?',
    a: 'Once you connect Canvas, assignments and due dates flow onto your board automatically. Planevo only reads your course work — it never posts, submits, or changes anything in Canvas.',
  },
  {
    q: 'What does "Plan my day" actually do?',
    a: 'It looks at your real calendar — classes, practice, meetings — finds the genuine gaps, and places your work into them. It never schedules over something that already exists, and it re-plans when your day changes.',
  },
  {
    q: 'What happens to what I write and say?',
    a: 'Your captures are used only to build your board and your plan. They are never sold, never used to train shared models, and you can delete them any time.',
  },
  {
    q: 'Is Planevo really free?',
    a: 'Yes. Sign up with no card and use the whole product — capture, the calm board, plan my day, tasks, calendar, notes, and Bruno (5 asks a day). Pro lifts the limits and adds power features, but you never have to pay to get real value.',
  },
  {
    q: 'What do I get by upgrading to Pro?',
    a: 'Pro removes the daily Bruno limit (including deep thinking), gives you unlimited plan-my-day with priority replanning, connects apps like Notion, Slack, and Linear, and includes priority support. It is $9.99/mo, or $4.99/mo with a verified .edu email.',
  },
  {
    q: 'How does the .edu discount work?',
    a: 'Verify a .edu email and Pro drops from $9.99 to $4.99 a month — same product, no feature cuts. Verification takes about a minute.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes — Planevo runs on iOS and Android, so you can capture from your pocket and check your plan between classes. The board stays in sync everywhere.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Any time, in two clicks, from settings. If you go Pro, you can downgrade back to Free whenever you like — your data stays put and there are no surprise charges.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-6 py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-5 lg:gap-16">
        {/* Littlebird split: serif headline left */}
        <ScrollReveal className="lg:col-span-2">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">
            Questions · Answered
          </p>
          <h2 className="font-serif text-[36px] leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-[44px]">
            Fair questions.
          </h2>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-[var(--color-ink-soft)]">
            The things students actually ask before handing an app their whole plate.
          </p>
        </ScrollReveal>

        {/* Accordion right — native details, no extra deps */}
        <ScrollReveal className="lg:col-span-3" delay={0.1}>
          <div className="flex flex-col">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group border-b border-[var(--color-line)] py-5 first:pt-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span
                    aria-hidden
                    className="flex-none font-serif text-[22px] leading-none text-[var(--color-ink)] transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
