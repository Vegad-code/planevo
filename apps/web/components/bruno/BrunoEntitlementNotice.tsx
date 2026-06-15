import Link from 'next/link';
import type {
  BrunoProCapNotice,
  BrunoProWarningNotice,
  BrunoUpgradeCard,
} from '@/lib/bruno/types';

type BrunoEntitlementNoticeProps = {
  notice: BrunoUpgradeCard | BrunoProWarningNotice | BrunoProCapNotice;
};

export function BrunoEntitlementNotice({
  notice,
}: BrunoEntitlementNoticeProps) {
  const isUpgrade = notice.type === 'bruno_upgrade_card';

  return (
    <aside
      aria-label={notice.title}
      className="w-full max-w-[44rem] rounded-2xl border border-[var(--color-settings-brand)]/30 bg-[var(--color-settings-brand)]/10 px-4 py-4 text-[var(--color-settings-text)]"
    >
      <p className="font-sans text-sm font-bold">{notice.title}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--color-settings-text-muted)]">
        {notice.body}
      </p>

      {isUpgrade && (
        <>
          <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {notice.bullets.map((bullet) => (
              <li key={bullet}>• {bullet}</li>
            ))}
          </ul>
          <Link
            href={notice.ctaHref}
            className="mt-4 inline-flex rounded-xl bg-[var(--color-settings-brand)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {notice.ctaText}
          </Link>
        </>
      )}
    </aside>
  );
}
