import { FeatureShowcase } from './FeatureShowcase';
import { AnimatedNotesDemo } from '../demo/AnimatedFeatureDemos';

export function FeatureNotes() {
  return (
    <FeatureShowcase
      id="notes"
      eyebrow="Notes · Tied to your day"
      headline="Notes that stay tied to your day."
      body="Capture lecture outlines, essay theses, and lab prep in notebooks that live next to your tasks — link a note to the day you'll need it, and turn key facts into flashcards in a tap."
      backdrop="meadow"
      learnMoreHref="/signup"
    >
      <AnimatedNotesDemo />
    </FeatureShowcase>
  );
}
