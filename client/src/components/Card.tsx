import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg.card shadow-soft">
      <header className="px-5 pt-4">
        <div className="text-base font-semibold">{title}</div>
        {subtitle ? <div className="text-sm text-text-muted">{subtitle}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "solid",
  rightIcon,
  leftIcon,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline";
  rightIcon?: ReactNode;
  leftIcon?: ReactNode;
  className?: string;
  type?: "button" | "submit";
}) {
  const base = "px-4 py-2 rounded-lg text-sm";
  const styles =
    variant === "solid"
      ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
      : "border border-bg-border text-text-secondary hover:bg-bg.hover";
  return (
    <button type={type} onClick={onClick} className={`${base} ${styles} ${className}`}>
      <span className="inline-flex items-center gap-2">
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    </button>
  );
}
