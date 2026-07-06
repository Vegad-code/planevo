import { FeatureShowcase } from './FeatureShowcase';
import { AnimatedTasksDemo } from '../demo/AnimatedFeatureDemos';

export function FeatureTasks() {
  return (
    <FeatureShowcase
      id="tasks"
      eyebrow="Tasks · Your backlog"
      headline="Your backlog, finally honest."
      body="Every responsibility in one list — due dates, sources, and what's actually done. Check things off, and when a day gets away from you, overdue work quietly rolls forward instead of piling up."
      backdrop="neutral"
      learnMoreHref="/signup"
    >
      <AnimatedTasksDemo />
    </FeatureShowcase>
  );
}
