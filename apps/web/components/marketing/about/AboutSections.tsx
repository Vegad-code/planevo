import { ScrollTextFill } from '@/components/landing-v2/motion/ScrollTextFill';
import { EditorialSection } from '@/components/landing-v2/editorial/EditorialSection';
import { Eyebrow } from '@/components/landing-v2/Eyebrow';
import { ScrollReveal } from '@/components/landing-v2/motion/ScrollReveal';

const QUOTES = [
  {
    quote:
      'Finally something that plans around my actual class schedule instead of pretending I have eight free hours.',
    name: 'Jordan M.',
    role: 'Sophomore, biology',
  },
  {
    quote:
      'The calm board is the first place I look when my week starts falling apart.',
    name: 'Alex R.',
    role: 'Student athlete',
  },
  {
    quote:
      'Canvas deadlines just show up — I do not have to re-type everything into another app.',
    name: 'Sam K.',
    role: 'Engineering student',
  },
];

export function AboutFounderSection() {
  return (
    <>
      <EditorialSection tone="charcoal" className="relative">
        <ScrollTextFill
          quote="I built Planevo because my own weeks kept falling apart. When your day changes, it shouldn't cost you the plan — it should just move with you."
          attribution="A student founder"
          role=""
          inverted
        />
      </EditorialSection>

      <section className="px-6 py-16 sm:py-24">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why I built it</Eyebrow>
          <h2 className="font-serif text-3xl tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Built by a student who knows the struggle
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-[var(--color-ink-soft)]">
            I&apos;m a student who struggled with time management the same way you might be
            right now. I built Planevo because I wanted a planner that respects real
            availability — not a fantasy grid that breaks the moment a class moves or
            practice runs late. I&apos;m always looking for ways to make it better for
            anyone else juggling the same chaos.
          </p>
        </ScrollReveal>
      </section>
    </>
  );
}

export function StudentSocialProof() {
  return (
    <section className="bg-[var(--color-charcoal)] px-6 py-16 sm:py-24">
      <ScrollReveal className="mx-auto max-w-6xl">
        <h2 className="text-center font-serif text-3xl tracking-tight text-[var(--color-paper)] sm:text-4xl">
          What students say
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {QUOTES.map((item) => (
            <blockquote
              key={item.name}
              className="flex flex-col rounded-2xl border border-[var(--color-paper)]/10 bg-[var(--color-paper)]/5 p-6"
            >
              <p className="flex-1 text-[15px] leading-relaxed text-[var(--color-paper)]/90">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-5 border-t border-[var(--color-paper)]/10 pt-4">
                <p className="text-[14px] font-semibold text-[var(--color-paper)]">
                  {item.name}
                </p>
                <p className="text-[12px] text-[var(--color-paper)]/60">{item.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
