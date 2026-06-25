'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { NextAction } from '@/lib/dashboard/types';

export function NextActionCard({ nextAction }: { nextAction: NextAction }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (nextAction.timingStatus === 'NOW') {
      const interval = setInterval(() => setNow(new Date()), 60000);
      return () => clearInterval(interval);
    }
  }, [nextAction.timingStatus]);

  const totalDurationMin = Math.round(
    (nextAction.endTime.getTime() - nextAction.startTime.getTime()) / 60000
  );

  let elapsedMin = 0;
  let progressPercent = 0;

  if (nextAction.timingStatus === 'NOW') {
    elapsedMin = Math.max(
      0,
      Math.round((now.getTime() - nextAction.startTime.getTime()) / 60000)
    );
    progressPercent = Math.min(100, Math.max(0, (elapsedMin / totalDurationMin) * 100));
  } else if (now > nextAction.endTime) {
    elapsedMin = totalDurationMin;
    progressPercent = 100;
  }

  return (
    <div className="bg-(--color-paper) text-(--color-ink) rounded-2xl p-5 shadow-sm border border-line-strong">
      <div className="flex justify-between items-center mb-3">
        <span className="font-mono text-[11px] text-(--color-ink-soft) tracking-widest">
          {nextAction.timingStatus} · {format(nextAction.startTime, 'h:mm a')}
        </span>
        <span className="font-mono text-[10px] text-(--color-sage) tracking-widest">● FOCUS</span>
      </div>
      <div className="font-serif text-xl tracking-tight mb-2 leading-tight">{nextAction.title}</div>
      <div className="text-xs text-(--color-ink-soft) font-mono tracking-wide mb-3 flex items-center gap-2">
        <span className="text-(--color-rose)">●</span>
        {totalDurationMin} min
      </div>
      <div className="h-1.5 bg-(--color-cream-2) rounded-full overflow-hidden mb-2.5">
        <div
          className="h-full bg-(--color-honey) rounded-full transition-all duration-1000 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[10px] text-(--color-ink-soft) tracking-[0.06em]">
          {elapsedMin} MIN IN
        </span>
        <span className="font-mono text-[10px] text-(--color-honey-deep) tracking-[0.06em]">
          BRUNO: YOU GOT THIS
        </span>
      </div>
    </div>
  );
}
