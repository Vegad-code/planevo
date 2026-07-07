import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  authErrorBannerClass,
  authFooterLinkClass,
  authInputClass,
  authInputBoxClass,
  authInputMinimalClass,
  authInputHelperClass,
  authLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
  authStepIndicatorClass,
  authTrustLineClass,
} from './auth-styles';

interface AuthFieldProps {
  label: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
  labelExtra?: React.ReactNode;
  helperText?: React.ReactNode;
  className?: string;
}

export function AuthField({
  label,
  htmlFor,
  children,
  labelExtra,
  helperText,
  className,
}: AuthFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className={authLabelClass}>
          {label}
        </label>
        {labelExtra}
      </div>
      {children}
      {helperText ? <p className={authInputHelperClass}>{helperText}</p> : null}
    </div>
  );
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  variant?: 'default' | 'minimal' | 'box';
}

const authInputVariants = {
  default: authInputClass,
  minimal: authInputMinimalClass,
  box: authInputBoxClass,
} as const;

export function AuthInput({ className, variant = 'default', ...props }: AuthInputProps) {
  return (
    <input
      className={cn(authInputVariants[variant], className)}
      {...props}
    />
  );
}

interface AuthPrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
}

export function AuthPrimaryButton({
  children,
  loading = false,
  loadingLabel,
  disabled,
  className,
  ...props
}: AuthPrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(authPrimaryButtonClass, className)}
      {...props}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

interface AuthSecondaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AuthSecondaryButton({
  children,
  className,
  ...props
}: AuthSecondaryButtonProps) {
  return (
    <button type="button" className={cn(authSecondaryButtonClass, className)} {...props}>
      {children}
    </button>
  );
}

const GOOGLE_ICON = (
  <svg className="mr-3 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

interface AuthGoogleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AuthGoogleButton({
  children,
  className,
  ...props
}: AuthGoogleButtonProps) {
  return (
    <button type="button" className={cn(authSecondaryButtonClass, className)} {...props}>
      {GOOGLE_ICON}
      {children}
    </button>
  );
}

interface AuthErrorBannerProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export function AuthErrorBanner({ children, id, className }: AuthErrorBannerProps) {
  return (
    <div id={id} className={cn(authErrorBannerClass, className)} role="alert">
      {children}
    </div>
  );
}

interface AuthFooterLinkProps {
  prompt: string;
  href: string;
  linkLabel: string;
  id?: string;
}

export function AuthFooterLink({ prompt, href, linkLabel, id }: AuthFooterLinkProps) {
  return (
    <p className={cn(authFooterLinkClass)}>
      {prompt}{' '}
      <Link href={href} className={authLinkClass} id={id}>
        {linkLabel}
      </Link>
    </p>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[var(--color-line-strong)]" />
      </div>
      <div className="relative flex justify-center text-xs font-bold">
        <span className="bg-[var(--color-paper)] px-4 uppercase tracking-widest text-[var(--color-ink-faint)]">
          or
        </span>
      </div>
    </div>
  );
}

export function AuthTrustLine({ children }: { children: React.ReactNode }) {
  return <p className={authTrustLineClass}>{children}</p>;
}

export function SignupStepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <p className={authStepIndicatorClass} aria-live="polite">
      Step {step} of {total}
    </p>
  );
}
