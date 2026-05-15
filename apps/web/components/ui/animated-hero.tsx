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
    <div className="w-full bg-background text-foreground border-b-2 border-surface-900 overflow-hidden">
      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side: Copy */}
          <div className="flex flex-col gap-8 items-start text-left">
            <div>
              <Button variant="outline" size="sm" className="gap-4 font-black uppercase text-foreground border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] rounded-full">
                Introducing Plan Pilot 2.0 <Star weight="fill" className="w-4 h-4 text-accent-500" />
              </Button>
            </div>
            <div className="flex gap-4 flex-col">
              <h1 className="text-h1 md:text-8xl leading-[0.85]">
                Plan Pilot <br />is <span className="text-accent-500">YOUR</span> <br />
                <span className="relative flex w-full overflow-hidden md:pb-4 md:pt-1 text-brand-500">
                  &nbsp;
                  {titles.map((title, index) => (
                    <motion.span
                      key={index}
                      className="absolute font-black"
                      initial={{ opacity: 0, y: "-100" }}
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
              <p className="text-body max-w-xl mt-12">
                The world&apos;s first AI agent built for the student brain. 
                <span className="text-surface-900"> Ollie</span> turns your Canvas chaos into one calm, next action.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
              <Button size="lg" className="bg-surface-900 text-white gap-2 text-xl px-12 py-10 border-2 border-surface-900 shadow-[10px_10px_0px_0px_var(--brand-500)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all" asChild>
                <Link href="/signup">Start Your Path <ArrowRight weight="bold" className="w-6 h-6" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-lg px-10 py-8 border-2 border-surface-900 shadow-[8px_8px_0px_0px_var(--surface-200)]" asChild>
                <a href="#features">See features</a>
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-12 pt-12 border-t-2 border-surface-200 w-full">
                <div className="flex -space-x-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-2 border-surface-900 bg-surface-100 flex items-center justify-center font-black text-xs">
                            S{i}
                        </div>
                    ))}
                </div>
                <div>
                    <div className="flex gap-1 text-accent-500">
                        {[1,2,3,4,5].map(i => <Star key={i} weight="fill" className="w-4 h-4" />)}
                    </div>
                    <p className="text-meta text-surface-400">Trusted by 2,000+ Students</p>
                </div>
            </div>
          </div>

          {/* Right Side: Simulation */}
          <div className="relative w-full">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/10 blur-[120px] rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent-500/10 blur-[120px] rounded-full" />
            
            <motion.div
                initial={{ opacity: 0, x: 50, rotate: 2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                <PlanSimulation />
            </motion.div>

            {/* Floating Accents */}
            <motion.div 
                className="absolute -top-10 -left-10 bg-white border-2 border-surface-900 p-4 rounded-2xl shadow-xl flex items-center gap-3 z-20"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="w-8 h-8 bg-success rounded-lg flex items-center justify-center text-white">
                    <Sparkle weight="fill" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-surface-400 leading-none mb-1">Canvas Sync</span>
                    <span className="text-xs font-black text-surface-900">Assignments Linked</span>
                </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
