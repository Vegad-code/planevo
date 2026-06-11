"use client";

import { useEffect, useState } from "react";

interface BrunoBubbleProps {
  text: string;
  align?: "left" | "center" | "right";
  tone?: "cream" | "dark";
}

export function BrunoBubble({ text, align = "left", tone = "cream" }: BrunoBubbleProps) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      setShown("");
      setDone(false);
      let index = 0;
      intervalId = setInterval(() => {
        index += 1;
        setShown(text.slice(0, index));
        if (index >= text.length && intervalId) {
          clearInterval(intervalId);
          setDone(true);
        }
      }, 18);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text]);

  const isDark = tone === "dark";

  return (
    <div
      key={text}
      className="bubble-in"
      style={{
        background: isDark ? "var(--color-bruno-deep)" : "var(--color-paper)",
        color: isDark ? "var(--color-paper)" : "var(--color-ink)",
        border: isDark ? "none" : "1px solid var(--color-line)",
        borderLeft: isDark ? "none" : "3px solid var(--color-honey)",
        borderRadius: 14,
        padding: "14px 18px",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: 17,
        lineHeight: 1.4,
        minHeight: 48,
        textAlign: align,
      }}
    >
      {shown}
      {!done && <span className="typing-cursor" />}
      {done && (
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: isDark ? "var(--color-honey)" : "var(--color-bruno-deep)",
            letterSpacing: "0.1em",
            fontStyle: "normal",
          }}
        >
          - BRUNO
        </div>
      )}
    </div>
  );
}
