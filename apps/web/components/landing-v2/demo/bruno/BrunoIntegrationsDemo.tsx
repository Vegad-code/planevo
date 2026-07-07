'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from '@phosphor-icons/react';
import Link from 'next/link';
import { LinearIcon, NotionIcon, SlackIcon } from '@/components/icons/BrandIcons';
import { BrunoDemoShell } from './BrunoDemoShell';
import { BrunoProposalCard } from './BrunoProposalCard';
import { useBrunoDemoScript } from './useBrunoDemoScript';
import {
  type IntegrationAppKey,
  type IntegrationDemoScenario,
  createIntegrationDemoPicker,
} from './brunoIntegrationDemos';
import { cn } from '@/lib/utils';

const INTEGRATION_ICONS: Record<
  IntegrationAppKey,
  { Icon: typeof NotionIcon; className?: string }
> = {
  notion: { Icon: NotionIcon, className: 'text-[var(--color-ink)]' },
  slack: { Icon: SlackIcon },
  linear: { Icon: LinearIcon },
};

function IntegrationAppIcon({
  app,
  className,
}: {
  app: IntegrationAppKey;
  className?: string;
}) {
  const { Icon, className: iconClassName } = INTEGRATION_ICONS[app];
  return <Icon className={cn('h-3.5 w-3.5 shrink-0', iconClassName, className)} aria-hidden />;
}

function IntegrationResultRow({ demo }: { demo: IntegrationDemoScenario }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 py-2"
    >
      <span className="flex items-center gap-2 text-[11px] text-[var(--color-ink-soft)]">
        <IntegrationAppIcon app={demo.app} />
        {demo.label} result
      </span>
      <span className="truncate text-[11px] font-medium text-[var(--color-ink)]">
        {demo.resultTitle}
      </span>
    </motion.div>
  );
}

export function BrunoIntegrationsDemo() {
  const [picker] = useState(() => createIntegrationDemoPicker());
  const [demo, setDemo] = useState<IntegrationDemoScenario>(() => picker());
  const { ref, step, finished, replay: replayScript } = useBrunoDemoScript({
    steps: 5,
    intervalMs: 1500,
  });

  const replay = useCallback(() => {
    setDemo(picker());
    replayScript();
  }, [picker, replayScript]);

  const showResult = step >= 3;
  const showProposal = step >= 4;

  return (
    <div ref={ref} aria-hidden>
      <BrunoDemoShell
        userMessage={demo.userMessage}
        step={step}
        thinkingStep={2}
        minHeight="200px"
        showReplay={finished}
        onReplay={replay}
        footer={showResult ? <IntegrationResultRow demo={demo} /> : null}
      >
        {showProposal && (
          <div className="flex flex-col gap-2">
            <BrunoProposalCard
              intro={demo.proposalIntro}
              title={demo.resultTitle}
              meta={demo.resultMeta}
              iconSlot={<IntegrationAppIcon app={demo.app} className="h-4 w-4" />}
              approveLabel={demo.approveLabel}
            />
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[var(--color-honey)] bg-[var(--color-honey-soft)] px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--color-honey-deep)]">
              <Lock size={8} weight="bold" />
              Pro
            </span>
          </div>
        )}
      </BrunoDemoShell>
    </div>
  );
}

export function BrunoProTease() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-paper)]/60">
        Pro · Connected apps
      </p>
      <BrunoIntegrationsDemo />
      <p className="max-w-md text-[14px] leading-relaxed text-[var(--color-paper)]/75">
        Search Notion, Slack, and Linear from chat — Bruno proposes, you approve.
      </p>
      <Link
        href="/pricing"
        className="rounded-full border border-[var(--color-paper)]/25 px-4 py-2 text-[13px] font-medium text-[var(--color-paper)] transition-colors hover:border-[var(--color-paper)]/50 hover:bg-[var(--color-paper)]/10"
      >
        See Pro features
      </Link>
    </div>
  );
}
