import { DotGridPage } from '@/components/landing-v2/DotGridSurface';
import { FooterCinematicCta } from '@/components/landing-v2/sections/FooterCinematicCta';
import { LandingFooter } from '@/components/landing-v2/sections/LandingFooter';
import { MarketingMegaNav } from '@/components/marketing/MarketingMegaNav';
import { cn } from '@/lib/utils';

export function MarketingPageShell({
  children,
  className,
  showCta = true,
  padMain = true,
}: {
  children: React.ReactNode;
  className?: string;
  showCta?: boolean;
  padMain?: boolean;
}) {
  return (
    <DotGridPage className={cn('selection:bg-[var(--color-surface-muted)]', className)}>
      <MarketingMegaNav />
      <main className={cn(padMain && 'pt-[44px] sm:pt-[48px]')}>{children}</main>
      {showCta ? <FooterCinematicCta /> : null}
      <LandingFooter />
    </DotGridPage>
  );
}
