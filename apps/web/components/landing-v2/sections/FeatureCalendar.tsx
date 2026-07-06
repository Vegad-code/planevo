import { FeatureShowcase } from './FeatureShowcase';
import { AnimatedCalendarDemo } from '../demo/AnimatedFeatureDemos';

export function FeatureCalendar() {
  return (
    <FeatureShowcase
      id="calendar"
      eyebrow="Calendar · The whole week"
      headline="See the whole week at once."
      body="Classes, practice, and meetings in one view — so you know what's actually open before you plan. Google Calendar syncs in; Planevo never schedules over what's already there."
      backdrop="sky"
      learnMoreHref="/signup"
      reverse
    >
      <AnimatedCalendarDemo />
    </FeatureShowcase>
  );
}
