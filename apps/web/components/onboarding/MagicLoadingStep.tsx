"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bruno } from "./Bruno";

export function MagicLoadingStep({
  onComplete
}: {
  onComplete: () => void;
}) {
  const [loadingText, setLoadingText] = useState("Analyzing your schedule...");

  useEffect(() => {
    const texts = [
      "Analyzing your schedule...",
      "Finding focus blocks...",
      "Sprinkling magic dust...",
      "Finalizing your first plan..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < texts.length) {
        setLoadingText(texts[i]);
      } else {
        clearInterval(interval);
        setTimeout(() => onComplete(), 500); // give it a beat before advancing
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-8"
      >
        <div className="flex h-32 w-32 items-center justify-center rounded-[32px] border border-[var(--color-line)] bg-[var(--color-paper)] shadow-xl">
           <Bruno size={100} mood="happy" react={0} />
        </div>
      </motion.div>
      <h2 className="font-serif text-3xl">{loadingText}</h2>
      <div className="mt-6 flex gap-2">
        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="h-2 w-2 rounded-full bg-[var(--color-honey)]" />
        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="h-2 w-2 rounded-full bg-[var(--color-honey)]" />
        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="h-2 w-2 rounded-full bg-[var(--color-honey)]" />
      </div>
    </div>
  );
}
