import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Star, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PlanSimulation from "@/components/landing/PlanSimulation";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Smart Ally", "Second Brain", "Friendly Guide", "Focus Engine", "Calm Center"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full bg-[var(--color-cream)] text-[var(--color-ink)] border-b border-[var(--color-line)] overflow-hidden">
      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side: Copy */}
          <div className="flex flex-col gap-8 items-start text-left">
            <div>
              <Button variant="outline" size="sm" className="gap-4 font-mono font-medium uppercase tracking-widest text-[var(--color-ink-soft)] border border-[var(--color-line)] shadow-none rounded-full bg-transparent">
                Introducing Planevo 2.0 <Star weight="fill" className="w-4 h-4 text-[var(--color-honey)]" />
              </Button>
            </div>
            <div className="flex gap-4 flex-col">
              <h1 className="text-5xl md:text-8xl font-serif font-bold tracking-tight leading-[0.9]">
                Planevo <br />is <span className="text-[var(--color-sage)] italic">YOUR</span> <br />
                <span className="relative flex w-full overflow-hidden md:pb-4 md:pt-1 text-[var(--color-honey)]">
                  &nbsp;
                  {titles.map((title, index) => (
                    <motion.span
                      key={index}
                      className="absolute font-serif"
                      initial={{ opacity: 0, y: -100 }}
                      transition={{ type: "spring", stiffness: 50 }}
                      animate={
                        titleNumber === index
                          ? {
                              y: 0,
                              opacity: 1,
                            }
                          : {
                              y: titleNumber > index ? -150 : 150,
                              opacity: 0,
                            }
                      }
                    >
                      {title}
                    </motion.span>
                  ))}
                </span>
              </h1>
              <p className="text-lg font-sans text-[var(--color-ink-soft)] max-w-xl mt-8">
                The world&apos;s first AI agent built for the student brain. 
                <span className="text-[var(--color-ink)] font-semibold"> Bruno</span> turns your Canvas chaos into one calm, next action.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
              <Button size="lg" className="bg-[var(--color-ink)] text-[var(--color-cream)] font-mono font-bold uppercase tracking-widest gap-2 text-sm px-10 py-8 border-none shadow-none rounded-full hover:bg-[var(--color-ink-2)] transition-all" asChild>
                <Link href="/signup">Start Your Path <ArrowRight weight="bold" className="w-5 h-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="font-mono font-bold uppercase tracking-widest gap-2 text-sm px-10 py-8 border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)] shadow-none rounded-full hover:bg-[var(--color-line)] transition-all" asChild>
                <a href="#features">See features</a>
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-12 pt-12 border-t border-[var(--color-line)] w-full">
                <div className="flex -space-x-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-2 border-[var(--color-cream)] bg-[var(--color-paper)] flex items-center justify-center font-mono font-bold text-xs text-[var(--color-ink)] shadow-sm">
                            S{i}
                        </div>
                    ))}
                </div>
                <div>
                    <div className="flex gap-1 text-[var(--color-honey)] mb-1">
                        {[1,2,3,4,5].map(i => <Star key={i} weight="fill" className="w-4 h-4" />)}
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">Trusted by 2,000+ Students</p>
                </div>
            </div>
          </div>

          {/* Right Side: Simulation */}
          <div className="relative w-full">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--color-honey)]/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[var(--color-sage)]/20 blur-[120px] rounded-full pointer-events-none" />
            
            <motion.div
                initial={{ opacity: 0, x: 50, rotate: 2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                <PlanSimulation />
            </motion.div>

            {/* Floating Accents */}
            <motion.div 
                className="absolute -top-10 -left-10 bg-[var(--color-paper)] border border-[var(--color-line)] p-4 rounded-2xl shadow-lg flex items-center gap-3 z-20"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="w-8 h-8 bg-[var(--color-sage)] rounded-lg flex items-center justify-center text-[var(--color-cream)]">
                    <Sparkle weight="fill" />
                </div>
                <div className="flex flex-col">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-[var(--color-ink-faint)] leading-none mb-1">Canvas Sync</span>
                    <span className="font-sans text-xs font-semibold text-[var(--color-ink)]">Assignments Linked</span>
                </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
