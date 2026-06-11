'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldWarning, Trash, Warning } from '@phosphor-icons/react';
import { deleteAccountAction } from '@/app/dashboard/settings/danger/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type DeleteAccountCardProps = {
  confirmationText: string;
};

export function DeleteAccountCard({ confirmationText }: DeleteAccountCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = typedConfirmation.trim().toLowerCase() === confirmationText.trim().toLowerCase();

  const handleDelete = () => {
    if (!isConfirmed || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction(typedConfirmation);

      if (!result.success) {
        setError(result.error || 'Unable to delete your account.');
        return;
      }

      setOpen(false);
      router.replace(result.redirectTo || '/signup?account_deleted=1');
      router.refresh();
    });
  };

  return (
    <div className="bg-settings-card rounded-2xl border border-red-200 dark:border-red-900/40 shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex gap-4">
            <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <ShieldWarning size={22} weight="bold" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-settings-text">Delete account</h3>
              <p className="text-sm font-medium text-settings-text-muted leading-relaxed mt-2 max-w-2xl">
                Permanently remove your Planevo account, profile, tasks, calendar data, integrations, notifications,
                Bruno memory, and saved settings from the database.
              </p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setTypedConfirmation('');
              setError(null);
            }
          }}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash size={16} weight="bold" />
                Delete account
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-settings-card border-settings-border text-settings-text">
              <DialogHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
                  <Warning size={22} weight="bold" />
                </div>
                <DialogTitle className="text-settings-text">Permanently delete your account?</DialogTitle>
                <DialogDescription className="pt-2 text-settings-text-muted leading-relaxed">
                  This cannot be undone. Your login and all Planevo-owned data tied to this account will be deleted.
                  If you have an active subscription, Planevo will cancel it before deleting your account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-settings-text-muted">
                  Type {confirmationText} to confirm
                </label>
                <Input
                  value={typedConfirmation}
                  onChange={(event) => {
                    setTypedConfirmation(event.target.value);
                    setError(null);
                  }}
                  autoComplete="off"
                  className="h-11 border-settings-border bg-settings-bg text-settings-text"
                />
                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                  </p>
                )}
              </div>

              <DialogFooter className="mt-2 gap-2 sm:justify-between sm:space-x-0">
                <DialogClose asChild>
                  <button
                    type="button"
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-settings-border bg-transparent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-settings-text transition-colors hover:bg-settings-bg disabled:opacity-50"
                  >
                    Keep account
                  </button>
                </DialogClose>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!isConfirmed || isPending}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'Deleting...' : 'Delete forever'}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['Database', 'Profile and app data removed'],
            ['Authentication', 'Login account deleted'],
            ['Billing', 'Active subscription canceled first'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-settings-border bg-settings-bg/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-settings-text-muted mb-1">{label}</p>
              <p className="text-sm font-bold text-settings-text">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
