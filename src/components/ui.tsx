import { ReactNode } from "react";
import clsx from "clsx";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink-900 dark:text-paper-50 ledger-rule">
          {title}
        </h1>
        {subtitle && <p className="mt-3 text-sm text-ink-600 dark:text-ink-200 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-card", className)}>
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg" }) {
  const base = "focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-base" };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm",
    secondary: "bg-gold-500 text-ink-950 hover:bg-gold-400 shadow-sm",
    ghost: "bg-transparent border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-paper-100 hover:bg-ink-100 dark:hover:bg-ink-800",
    danger: "bg-crimson-600 text-white hover:bg-crimson-500"
  };
  return <button className={clsx(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger"; children: ReactNode }) {
  const tones = {
    neutral: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-paper-100",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400",
    warning: "bg-gold-100 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400",
    danger: "bg-crimson-100 text-crimson-600 dark:bg-crimson-600/20 dark:text-crimson-500"
  };
  return <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-ink-100 dark:bg-ink-800 grid place-items-center text-ink-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6M9 16h6M9 8h6M5 4h14a1 1 0 0 1 1 1v15l-4-3H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        </svg>
      </div>
      <h3 className="font-display font-semibold text-ink-900 dark:text-paper-50">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-200 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className)} width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="p-6 border-crimson-500/40">
      <p className="text-sm text-crimson-600 dark:text-crimson-500 font-medium">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}
