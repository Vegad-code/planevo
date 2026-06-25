'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { DashboardMode, NextAction, ParsedScheduleBlock } from '@/lib/dashboard/types';
import { BrunoMark } from './BrunoMark';
import { NextActionCard } from './NextActionCard';

interface DashboardHeroProps {
  mode: DashboardMode;
  nextAction: NextAction | null;
  upNextBlocks: ParsedScheduleBlock[];
}

export function DashboardHero({ mode, nextAction, upNextBlocks }: DashboardHeroProps) {
  const router = useRouter();
  const hasAction = mode === 'active_day' && nextAction;

  return (
    <div className="bg-(--color-ink) border border-line text-(--color-paper) rounded-[22px] p-6 md:p-9 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-9 mb-6 min-h-70">
      <div className="flex flex-col">
        <div className="flex items-center gap-2.5 mb-5">
          <BrunoMark size={36} mood={hasAction ? 'happy' : 'normal'} />
          <div>
            <div className="font-mono text-[11px] tracking-[0.16em] text-[rgba(251,246,234,0.5)]">
              BRUNO · JUST NOW
            </div>
            <div className="font-serif text-[22px] text-(--color-paper) mt-1 italic">
              {hasAction
                ? 'Tonight is for the light stuff.'
                : mode === 'needs_plan'
                  ? 'Ready when you are.'
                  : "Let's plan this out."}
            </div>
          </div>
        </div>

        <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight font-normal my-0 mb-4 text-(--color-paper)">
          {hasAction ? (
            <>
              Your <em className="text-(--color-honey) italic font-serif">next move</em>
              <br />
              is ready.
            </>
          ) : mode === 'caught_up' ? (
            <>
              You&apos;re <em className="text-(--color-honey) italic font-serif">all clear</em>
              <br />
              for now.
            </>
          ) : (
            <>
              Your <em className="text-(--color-honey) italic font-serif">schedule</em>
              <br />
              is empty.
            </>
          )}
        </h2>

        <p className="text-[15px] text-[rgba(251,246,234,0.7)] leading-relaxed m-0 max-w-md">
          {hasAction
            ? `Your next block starts at ${format(nextAction.startTime, 'h:mm a')}. Bruno arranged your schedule based on your energy and priorities.`
            : mode === 'needs_plan'
              ? 'You have work waiting — let Bruno build a plan around your energy and deadlines.'
              : mode === 'caught_up'
                ? 'Nothing urgent on the horizon. Add something new or enjoy the breathing room.'
                : 'Connect your tools or add a task, then let Bruno shape your day.'}
        </p>

        <div className="flex flex-wrap gap-3 mt-auto pt-7">
          {hasAction ? (
            <>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/deep-work?taskId=${nextAction.id}`)}
                className="bg-(--color-honey) text-(--color-ink) border-none px-5 py-2.5 rounded-full text-sm font-medium hover:bg-(--color-honey-soft) hover:scale-105 transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-ink) focus-visible:ring-(--color-honey)"
              >
                Dive in <span>&rarr;</span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/daily-plan')}
                className="bg-transparent text-(--color-paper) border border-[rgba(251,246,234,0.2)] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[rgba(251,246,234,0.05)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-ink) focus-visible:ring-(--color-paper)"
              >
                See full plan
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/dashboard/daily-plan')}
              className="bg-(--color-honey) text-(--color-ink) border-none px-5 py-2.5 rounded-full text-sm font-medium hover:bg-(--color-honey-soft) hover:scale-105 transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-ink) focus-visible:ring-(--color-honey)"
            >
              {mode === 'needs_plan' ? 'Generate Plan' : 'Build your day'}{' '}
              <span>&rarr;</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {hasAction && <NextActionCard nextAction={nextAction} />}

        {upNextBlocks.length > 0 && (
          <div className="bg-[rgba(251,246,234,0.05)] border border-[rgba(251,246,234,0.08)] rounded-2xl p-5">
            <div className="font-mono text-[10px] text-[rgba(251,246,234,0.5)] tracking-[0.16em] mb-3">
              UP NEXT TODAY
            </div>
            <div className="flex flex-col">
              {upNextBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-start gap-4 py-3 border-t border-[rgba(251,246,234,0.06)] first:border-0"
                >
                  <span className="font-mono text-[11px] text-[#A3B899] bg-[rgba(163,184,153,0.15)] px-2 py-0.5 rounded whitespace-nowrap">
                    {format(block.startTime, 'h:mm a')}
                  </span>
                  <span className="text-[14px] font-medium flex-1 truncate text-(--color-paper) leading-tight">
                    {block.title}
                  </span>
                  <span className="font-mono text-[10px] text-[rgba(251,246,234,0.5)] mt-0.5">
                    {Math.round(
                      (block.endTime.getTime() - block.startTime.getTime()) / 60000
                    )}
                    m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
