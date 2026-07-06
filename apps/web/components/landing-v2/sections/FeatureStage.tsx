import { cn } from '@/lib/utils';
import { StageBackdrop, type StageBackdropVariant } from '../StageBackdrop';
import { ScrollZoom } from '../motion/ScrollZoom';

export function FeatureStage({
  backdrop,
  children,
  className,
}: {
  backdrop: StageBackdropVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ScrollZoom className={cn('mx-auto w-full max-w-4xl', className)}>
      <div className="relative overflow-hidden rounded-[32px] p-6 sm:p-10">
        <StageBackdrop variant={backdrop} className="rounded-[32px]" />
        <div className="relative">{children}</div>
      </div>
    </ScrollZoom>
  );
}
