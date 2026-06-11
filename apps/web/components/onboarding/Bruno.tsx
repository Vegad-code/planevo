"use client";

import { useRef } from "react";

type BrunoMood = "normal" | "happy" | "thinking" | "curious" | "sleepy" | "celebrating";

interface BrunoProps {
  size?: number;
  mood?: BrunoMood;
  wave?: boolean;
  react?: number;
  className?: string;
}

export function Bruno({
  size = 110,
  mood = "normal",
  wave = false,
  react = 0,
  className = "",
}: BrunoProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={hostRef}
      key={react > 0 ? react : undefined}
      className={`bruno-host ${react ? "react" : ""} ${className}`}
      style={{ width: size, height: size * 1.1 }}
      aria-label={`Bruno the Bear, ${mood} mood`}
      role="img"
    >
      <svg viewBox="0 0 200 220" width={size} height={size * 1.1} aria-hidden="true">
        <ellipse cx="100" cy="210" rx="55" ry="5" fill="rgba(0,0,0,0.10)" />

        <circle cx="48" cy="42" r="22" fill="var(--color-bruno-deep)" />
        <circle cx="152" cy="42" r="22" fill="var(--color-bruno-deep)" />
        <circle cx="48" cy="44" r="10" fill="var(--color-bruno-light)" />
        <circle cx="152" cy="44" r="10" fill="var(--color-bruno-light)" />

        <ellipse cx="100" cy="160" rx="68" ry="58" fill="var(--color-bruno)" />
        <ellipse cx="100" cy="170" rx="42" ry="40" fill="var(--color-belly)" />
        <circle cx="100" cy="80" r="56" fill="var(--color-bruno)" />
        <ellipse cx="100" cy="92" rx="30" ry="22" fill="var(--color-belly)" />

        {mood === "sleepy" ? (
          <>
            <path d="M 72 72 Q 80 76 88 72" stroke="var(--color-ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M 112 72 Q 120 76 128 72" stroke="var(--color-ink)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </>
        ) : mood === "thinking" ? (
          <>
            <circle className="bruno-eye" cx="80" cy="70" r="4.5" fill="var(--color-ink)" />
            <circle className="bruno-eye right" cx="124" cy="68" r="4.5" fill="var(--color-ink)" />
            <circle cx="81.5" cy="68.5" r="1.5" fill="var(--color-paper)" />
            <circle cx="125.5" cy="66.5" r="1.5" fill="var(--color-paper)" />
          </>
        ) : mood === "happy" || mood === "celebrating" ? (
          <>
            <path d="M 74 72 Q 80 66 86 72" stroke="var(--color-ink)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 114 72 Q 120 66 126 72" stroke="var(--color-ink)" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : mood === "curious" ? (
          <>
            <circle className="bruno-eye" cx="80" cy="74" r="5.5" fill="var(--color-ink)" />
            <circle className="bruno-eye right" cx="120" cy="74" r="5.5" fill="var(--color-ink)" />
            <circle cx="82" cy="72" r="1.8" fill="var(--color-paper)" />
            <circle cx="122" cy="72" r="1.8" fill="var(--color-paper)" />
          </>
        ) : (
          <>
            <circle className="bruno-eye" cx="80" cy="72" r="4.5" fill="var(--color-ink)" />
            <circle className="bruno-eye right" cx="120" cy="72" r="4.5" fill="var(--color-ink)" />
            <circle cx="81.5" cy="70.5" r="1.5" fill="var(--color-paper)" />
            <circle cx="121.5" cy="70.5" r="1.5" fill="var(--color-paper)" />
          </>
        )}

        <ellipse cx="100" cy="86" rx="5" ry="3.5" fill="var(--color-ink)" />

        {mood === "happy" || mood === "celebrating" ? (
          <path d="M 84 98 Q 100 114 116 98" stroke="var(--color-ink)" strokeWidth="2.8" fill="var(--color-bruno-deep)" strokeLinejoin="round" />
        ) : mood === "thinking" ? (
          <path d="M 92 102 Q 100 100 108 102" stroke="var(--color-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        ) : mood === "curious" ? (
          <circle cx="100" cy="102" r="3" fill="var(--color-ink)" />
        ) : (
          <path d="M 90 100 Q 100 106 110 100" stroke="var(--color-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        )}

        {mood === "celebrating" && (
          <>
            <ellipse cx="70" cy="92" rx="6" ry="3" fill="var(--color-rose)" opacity="0.4" />
            <ellipse cx="130" cy="92" rx="6" ry="3" fill="var(--color-rose)" opacity="0.4" />
          </>
        )}

        {wave && (
          <g className="bruno-arm-wave">
            <ellipse cx="42" cy="130" rx="14" ry="16" fill="var(--color-bruno)" transform="rotate(-20 42 130)" />
            <circle cx="38" cy="118" r="5" fill="var(--color-belly)" />
          </g>
        )}

        {mood === "thinking" && (
          <g>
            <circle cx="148" cy="40" r="3" fill="var(--color-honey)" opacity="0.8" />
            <circle cx="160" cy="28" r="2" fill="var(--color-honey)" opacity="0.6" />
          </g>
        )}
      </svg>
    </div>
  );
}
