import { ScrollTextFill } from '../motion/ScrollTextFill';
import { EditorialSection } from '../editorial/EditorialSection';

export function FoundersNote() {
  return (
    <EditorialSection tone="charcoal" className="relative">
      <ScrollTextFill
        quote="We built Planevo because our own weeks kept falling apart. When your day changes, it shouldn't cost you the plan — it should just move with you."
        attribution="The Planevo Team"
        role=""
        inverted
      />
    </EditorialSection>
  );
}
