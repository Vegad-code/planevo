import { ScrollTextFill } from '../motion/ScrollTextFill';
import { EditorialSection } from '../editorial/EditorialSection';

export function FoundersNote() {
  return (
    <EditorialSection tone="charcoal" className="relative">
      <ScrollTextFill
        quote="I built Planevo because my own weeks kept falling apart. When your day changes, it shouldn't cost you the plan — it should just move with you."
        attribution="A student founder"
        role=""
        inverted
      />
    </EditorialSection>
  );
}
