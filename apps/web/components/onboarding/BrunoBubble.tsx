"use client";

import React, { useState, useEffect } from 'react';

interface BrunoBubbleProps {
  text: string;
  align?: 'left' | 'center' | 'right';
  tone?: 'cream' | 'dark';
}

export function BrunoBubble({ text, align = 'left', tone = 'cream' }: BrunoBubbleProps) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);

   
  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    
    // Defer state updates to avoid synchronous cascade warnings
    setTimeout(() => {
      setShown('');
      setDone(false);
      let i = 0;
      id = setInterval(() => {
        i++;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(id);
          setDone(true);
        }
      }, 22);
    }, 0);
    
    return () => {
      if (id) clearInterval(id);
    };
  }, [text]);

  const styles = tone === 'dark' ? {
    bg: "var(--color-bruno-deep)", fg: "var(--color-paper)", sub: "var(--color-honey)", border: 'transparent',
  } : {
    bg: "var(--color-paper)", fg: "var(--color-ink)", sub: "var(--color-bruno-deep)", border: "var(--color-honey)",
  };

  return (
    <div
      key={text}
      className="bubble-in"
      style={{
        background: styles.bg,
        color: styles.fg,
        borderLeft: tone === 'cream' ? `3px solid ${styles.border}` : 'none',
        border: tone === 'cream' ? `1px solid var(--color-line)` : 'none',
        borderLeftWidth: tone === 'cream' ? 3 : 0,
        borderLeftColor: tone === 'cream' ? styles.border : 'transparent',
        borderLeftStyle: tone === 'cream' ? 'solid' : 'none',
        borderRadius: 14,
        padding: '14px 18px',
        fontFamily: "var(--font-serif)",
        fontStyle: 'italic',
        fontSize: 17,
        lineHeight: 1.4,
        minHeight: 48,
        textAlign: align,
      }}
    >
      {shown}
      {!done && <span className="typing-cursor" />}
      {done && (
        <div style={{
          marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 10,
          color: styles.sub, letterSpacing: '0.1em',
          fontStyle: 'normal',
        }}>— BRUNO</div>
      )}
    </div>
  );
}
