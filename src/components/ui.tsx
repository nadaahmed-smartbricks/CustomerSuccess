import Link from "next/link";
import type { ReactNode } from "react";

export function Badge({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
        {label}
      </span>
      <span className="text-3xl font-semibold">{value}</span>
      {hint && <span className="text-xs text-black/50 dark:text-white/50">{hint}</span>}
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-white/80"
      : "border border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10";
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium transition ${styles}`}
    >
      {children}
    </Link>
  );
}

export function BarRow({
  label,
  value,
  max,
  hint,
  colorClass = "bg-slate-400 dark:bg-slate-500",
}: {
  label: ReactNode;
  value: number;
  max: number;
  hint?: ReactNode;
  colorClass?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 shrink-0 truncate">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right tabular-nums text-black/60 dark:text-white/60">
        {hint ?? value}
      </span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-black/50 dark:text-white/50">{hint}</p>}
    </Card>
  );
}
