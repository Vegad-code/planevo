import { ScrollReveal } from '@/components/landing-v2/motion/ScrollReveal';

const VALUES = [
  'Plans that move when your day changes',
  'Honest scheduling — no fantasy productivity grids',
  'Student pain, not enterprise theater',
  'Bruno acting with approval, not autopilot',
  'Software that respects your data',
];

export function ValuesGrid() {
  return (
    <section className="px-6 py-16 sm:py-24">
      <ScrollReveal className="mx-auto max-w-4xl text-center">
        <h2 className="font-serif text-3xl tracking-tight text-[var(--color-ink)] sm:text-4xl">
          We care about&hellip;
        </h2>
        <ul className="mt-10 flex flex-col gap-4 text-left sm:gap-5">
          {VALUES.map((value) => (
            <li
              key={value}
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-5 text-[16px] leading-relaxed text-[var(--color-ink)] sm:text-[17px]"
            >
              {value}
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  );
}
