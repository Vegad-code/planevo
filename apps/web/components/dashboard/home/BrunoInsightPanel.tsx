'use client';

import { useRouter } from 'next/navigation';
import { useBruno } from '@/components/bruno/BrunoProvider';

interface BrunoInsightPanelProps {
  insight: string;
  insightLoading: boolean;
  openTaskCount: number;
}

export function BrunoInsightPanel({
  insight,
  insightLoading,
  openTaskCount,
}: BrunoInsightPanelProps) {
  const router = useRouter();
  const { openBruno } = useBruno();

  return (
    <div className="bg-bruno-deep border border-line text-(--color-paper) rounded-[22px] p-6 flex flex-col shadow-sm">
      <div className="font-mono text-[11px] tracking-[0.16em] text-(--color-honey) mb-3.5">
        BRUNO NOTICED
      </div>

      <div className="flex-1">
        {insightLoading ? (
          <div className="flex gap-2 items-center text-[rgba(251,246,234,0.65)]">
            <div className="w-4 h-4 border-2 border-(--color-honey) border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-serif italic">Bruno is thinking...</span>
          </div>
        ) : insight ? (
          <div className="flex flex-col gap-4">
            {insight.split(/(?<=[.!?])\s+(?=[A-Z])/).map((sentence, idx) => (
              <p
                key={idx}
                className="font-serif text-[20px] md:text-[22px] leading-[1.3] text-(--color-paper) m-0"
              >
                {sentence}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="font-serif text-[20px] md:text-[22px] leading-[1.3] text-(--color-paper) m-0">
              You have{' '}
              <em className="text-(--color-honey) not-italic">{openTaskCount}</em> open tasks.
            </p>
            <p className="font-serif text-[20px] md:text-[22px] leading-[1.3] text-(--color-paper) m-0">
              Let&apos;s gently get to work.
            </p>
            <p className="text-[14px] text-[rgba(251,246,234,0.7)] leading-relaxed m-0">
              I&apos;ll prioritize the deep work for you. Take it one step at a time.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => router.push('/dashboard/daily-plan')}
          className="bg-(--color-honey) text-(--color-ink) border-none px-5 py-2.5 text-center rounded-full text-sm font-medium hover:bg-(--color-honey-soft) hover:scale-[1.01] transition-all w-full cursor-pointer"
        >
          Let&apos;s prep your day
        </button>
        <button
          type="button"
          onClick={() =>
            openBruno({ source: 'dashboard', page: '/dashboard', label: 'Dashboard' })
          }
          className="bg-transparent text-(--color-paper) border border-[rgba(251,246,234,0.2)] px-5 py-2.5 text-center rounded-full text-sm font-medium hover:bg-[rgba(251,246,234,0.05)] transition-all w-full cursor-pointer"
        >
          Open chat with Bruno
        </button>
      </div>
    </div>
  );
}
