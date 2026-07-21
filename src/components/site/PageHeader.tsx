import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-soft border-b border-border">
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(600px circle at 20% 20%, oklch(0.62 0.17 245 / 0.15), transparent 60%), radial-gradient(500px circle at 80% 80%, oklch(0.62 0.18 150 / 0.15), transparent 60%)" }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        )}
        <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
