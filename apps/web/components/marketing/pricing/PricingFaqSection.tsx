import { FAQS } from '@/components/landing-v2/sections/FaqSection';
import { Eyebrow } from '@/components/landing-v2/Eyebrow';
import { ScrollReveal } from '@/components/landing-v2/motion/ScrollReveal';

export function PricingFaqSection() {
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
        <ScrollReveal className="lg:col-span-2">
          <Eyebrow>Questions · Answered</Eyebrow>
          <h2 className="font-serif text-[36px] leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-[44px]">
            Frequently asked questions
          </h2>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-[var(--color-ink-soft)]">
            The things students actually ask before handing an app their whole plate.
          </p>
        </ScrollReveal>

        <ScrollReveal className="lg:col-span-3" delay={0.1}>
          <div className="flex flex-col">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="faq-item group border-b border-[var(--color-line)] py-5 first:pt-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-[var(--color-ink-soft)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
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
