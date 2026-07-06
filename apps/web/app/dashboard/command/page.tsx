import { redirect } from 'next/navigation';
import { FEATURES } from '@/lib/featureFlags';
import { CommandView } from '@/components/command/CommandView';

/**
 * Planevo Command — the capture-first responsibility command center
 * (docs/superpowers/plans/comprehensive.md). Auth is enforced by the dashboard
 * layout; this page only gates on the feature flag and falls back to Daily Plan
 * when Command is off, so the old surface stays reachable for rollback (§8).
 */
export default function CommandPage() {
  if (!FEATURES.PLANEVO_COMMAND) {
    redirect('/dashboard/daily-plan');
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 sm:px-6">
      <CommandView />
    </div>
  );
}
