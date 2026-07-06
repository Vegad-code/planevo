import { FeatureShowcase } from './FeatureShowcase';
import { CaptureWaysDemo } from '../demo/CaptureWaysDemo';

export function FeatureCapture() {
  return (
    <FeatureShowcase
      id="capture"
      eyebrow="Capture · Clear my plate"
      headline="Type it, paste it, say it."
      body="Dump assignments, practices, promises, and half-remembered deadlines in one messy breath. Planevo turns it into real responsibilities with real dates — no setup, no forms, no re-typing."
      backdrop="sky"
      learnMoreHref="/signup"
    >
      <CaptureWaysDemo />
    </FeatureShowcase>
  );
}
