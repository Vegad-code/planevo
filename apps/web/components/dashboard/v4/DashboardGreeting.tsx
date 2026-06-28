'use client';

import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardGreetingProps {
  userName: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

const GREETINGS = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
} as const;

export function DashboardGreeting({ userName, timeOfDay }: DashboardGreetingProps) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--color-ink-faint)]">
        {format(new Date(), 'EEEE, MMM d')}
      </p>
      <h2 className={cn('font-serif text-2xl lg:text-3xl text-[var(--color-ink)] mt-1')}>
        {GREETINGS[timeOfDay]}, {userName.split(' ')[0]}
      </h2>
    </div>
  );
}
