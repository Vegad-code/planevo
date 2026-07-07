/** Shared class strings for auth form atoms — keeps label/typography in sync. */

export const authLabelClass =
  'text-sm font-medium text-[var(--color-ink-soft)]';

export const authHeadlineClass =
  'font-serif text-[40px] leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-[44px]';

export const authSubtitleClass =
  'text-[17px] leading-relaxed text-[var(--color-ink-soft)]';

export const authLinkClass =
  'font-semibold text-[var(--color-ocean-deep)] transition-colors hover:text-[var(--color-ocean)]';

export const authInputClass =
  'w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-4 py-3 transition-all placeholder:text-[var(--color-ink-faint)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-ocean)]';

/** Notion-style designated field — clear box, white fill, visible border. */
export const authInputBoxClass =
  'w-full rounded-lg border border-[var(--color-line-strong)] bg-white px-4 py-3.5 text-[var(--color-ink)] shadow-[0_1px_2px_rgba(20,20,20,0.04)] transition-all placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-ocean)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ocean)]/20';

export const authInputHelperClass =
  'text-[13px] leading-relaxed text-[var(--color-ink-faint)]';

export const authInputMinimalClass =
  'w-full rounded-none border-0 border-b border-[var(--color-line-strong)] bg-transparent px-0 py-3 transition-all placeholder:text-[var(--color-ink-faint)] focus:border-b-[var(--color-ocean)] focus:outline-none focus:ring-0';

export const authTrustLineClass =
  'text-center text-[13px] text-[var(--color-ink-faint)]';

export const authStepIndicatorClass =
  'text-xs font-medium uppercase tracking-widest text-[var(--color-ink-faint)]';

export const authPrimaryButtonClass =
  'w-full rounded-full bg-[var(--color-ocean)] px-4 py-3.5 text-base font-semibold text-[var(--color-charcoal)] transition-transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ocean)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

export const authSecondaryButtonClass =
  'flex w-full items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-4 py-3.5 text-base font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ocean)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

export const authErrorBannerClass =
  'rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-muted)] p-4 text-sm font-medium text-[var(--color-ink)]';

export const authFooterLinkClass =
  'mt-10 text-center text-sm font-medium text-[var(--color-ink-soft)]';
