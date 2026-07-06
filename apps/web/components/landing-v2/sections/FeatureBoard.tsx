import { FeatureShowcase } from './FeatureShowcase';
import { BoardDemoCard } from '../demo/StaticDemoCards';

export function FeatureBoard() {
  return (
    <FeatureShowcase
      id="board"
      eyebrow="The board · One calm place"
      headline="Your whole plate, calm."
      body="Everything you're responsible for, sorted into Now, Today, and Due soon — one quiet, scannable list instead of five apps and a knot in your stomach."
      backdrop="meadow"
      learnMoreHref="/signup"
      reverse
    >
      <BoardDemoCard />
    </FeatureShowcase>
  );
}
