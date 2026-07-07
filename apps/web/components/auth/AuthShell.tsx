import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';
import { cn } from '@/lib/utils';
import { AuthSeamlessLayout } from './AuthSeamlessLayout';
import { authHeadlineClass, authSubtitleClass } from './auth-styles';

interface SignupConversionShellProps {
  backHref: string;
  backLabel: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export function SignupConversionShell({
  backHref,
  backLabel,
  title,
  subtitle,
  children,
}: SignupConversionShellProps) {
  return (
    <AuthSeamlessLayout>
      <div className="mx-auto w-full max-w-[420px]">
        <Link
          href={backHref}
          className="group mb-8 inline-flex items-center text-sm font-medium text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
        >
          <CaretLeft
            weight="bold"
            className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1"
          />
          {backLabel}
        </Link>

        <div className="mb-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <PlanevoLogo size={52} gapColor="var(--color-paper)" />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className={authHeadlineClass}>{title}</h1>
            {subtitle ? <p className={authSubtitleClass}>{subtitle}</p> : null}
          </div>
        </div>

        {children}
      </div>
    </AuthSeamlessLayout>
  );
}

interface AuthShellProps {
  backHref: string;
  backLabel: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
  backLinkId?: string;
  showWordmark?: boolean;
}

export function AuthShell({
  backHref,
  backLabel,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-[420px]',
  backLinkId,
  showWordmark = true,
}: AuthShellProps) {
  return (
    <AuthSeamlessLayout>
      <div className={cn('mx-auto w-full', maxWidthClass)}>
        <Link
          href={backHref}
          id={backLinkId}
          className="group mb-12 inline-flex items-center text-sm font-medium text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
        >
          <CaretLeft
            weight="bold"
            className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1"
          />
          {backLabel}
        </Link>

        <div className="mb-10 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <PlanevoLogo size={40} gapColor="var(--color-paper)" />
            {showWordmark ? <PlanevoWordmark size="lg" /> : null}
          </div>

          <div className="flex flex-col gap-3">
            <h1 className={authHeadlineClass}>{title}</h1>
            {subtitle ? <p className={authSubtitleClass}>{subtitle}</p> : null}
          </div>
        </div>

        {children}
      </div>
    </AuthSeamlessLayout>
  );
}
