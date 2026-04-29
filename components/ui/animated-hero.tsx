"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["smart", "friendly", "adaptive", "proactive", "calm"],
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
    <div className="w-full bg-background text-foreground border-b-2 border-surface-900">
      <div className="container mx-auto px-6">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div>
            <Button variant="outline" size="sm" className="gap-4 font-black uppercase text-foreground border-2 border-border shadow-[2px_2px_0px_0px_var(--border)]">
              Introducing Plan Pilot <Star weight="thin" className="w-4 h-4 text-accent-500" />
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-4xl tracking-tighter text-center font-black uppercase">
              <span className="text-foreground">Plan Pilot is </span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 text-accent-500">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-bold"
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

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-surface-600 max-w-2xl text-center mx-auto mt-6">
              Get your life together, even when you don&apos;t feel like it. 
              The only productivity app that proactively nudges you, adapts your schedule when you miss tasks, 
              and coaches you through your day without the guilt trips.
            </p>
          </div>
          <div className="flex flex-row gap-4 mt-8">
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <Link href="/signup">Start Free <ArrowRight weight="thin" className="w-5 h-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8" asChild>
              <a href="#features">See how it works</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
