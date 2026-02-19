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
    <section className="rounded-xl border border-border bg-card">
      <header className="px-5 pt-4">
        <div className="text-base font-semibold text-text">{title}</div>
        {subtitle ? <div className="text-sm text-text-2">{subtitle}</div> : null}
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
      ? "bg-card hover:bg-border/40 text-text border border-border"
      : "border border-border text-text-2 hover:bg-card hover:text-text";
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
