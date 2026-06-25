'use client';

import { useState, useTransition } from 'react';
import { DownloadSimple, ShieldCheck } from '@phosphor-icons/react';
import { exportUserDataAction } from '@/app/dashboard/settings/privacy/actions';
import { DeleteAccountCard } from '@/components/settings/DeleteAccountCard';
import Link from 'next/link';

type DataExportCardProps = {
  userEmail: string | null;
};

export function DataExportCard({ userEmail }: DataExportCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setError(null);
    startTransition(async () => {
      const result = await exportUserDataAction();
      if (!result.success) {
        setError(result.error);
        return;
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `planevo-data-export-${stamp}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="bg-settings-card rounded-2xl border border-settings-border shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="h-11 w-11 rounded-xl bg-settings-bg border border-settings-border text-settings-text flex items-center justify-center shrink-0">
            <DownloadSimple size={22} weight="bold" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-settings-text">Export your data</h3>
            <p className="text-sm font-medium text-settings-text-muted leading-relaxed mt-2 max-w-2xl">
              Download a JSON copy of your profile, tasks, calendar events, Bruno conversations,
              AI memory, metrics, and Canvas assignments.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-settings-border bg-settings-bg px-5 py-2.5 text-sm font-bold text-settings-text transition-colors hover:bg-settings-card disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DownloadSimple size={16} weight="bold" />
          {isPending ? 'Preparing export...' : 'Download JSON export'}
        </button>
      </div>

      <div className="border-t border-settings-border px-6 sm:px-8 py-6">
        <DeleteAccountCard confirmationText={userEmail || 'DELETE MY ACCOUNT'} />
      </div>
    </div>
  );
}

export function PrivacyLegalLinks() {
  return (
    <div className="bg-settings-card rounded-2xl border border-settings-border shadow-sm p-6 sm:p-8">
      <div className="flex gap-4">
        <div className="h-11 w-11 rounded-xl bg-settings-bg border border-settings-border text-settings-text flex items-center justify-center shrink-0">
          <ShieldCheck size={22} weight="bold" />
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-xl font-bold text-settings-text">Legal & policies</h3>
            <p className="text-sm font-medium text-settings-text-muted leading-relaxed mt-2">
              Review how Planevo handles your information and your rights under GDPR and CCPA.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/privacy" className="text-sm font-bold text-settings-text underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm font-bold text-settings-text underline underline-offset-4">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-sm font-bold text-settings-text underline underline-offset-4">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
