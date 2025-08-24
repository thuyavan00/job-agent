import { CheckCircle2, FileText, GraduationCap, Briefcase, Boxes, ListChecks } from "lucide-react";
import { clsx } from "clsx";

type Step = { key: string; label: string; icon: any; done?: boolean; current?: boolean };

export function PageHeader({
  title,
  subtitle,
  stepIndex, // 0..4
}: {
  title: string;
  subtitle: string;
  stepIndex: number;
}) {
  const steps: Step[] = [
    { key: "basics", label: "Personal Information", icon: FileText },
    { key: "edu", label: "Education", icon: GraduationCap },
    { key: "exp", label: "Work Experience", icon: Briefcase },
    { key: "proj", label: "Projects", icon: Boxes },
    { key: "skills", label: "Skills", icon: ListChecks },
  ];

  const pct = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-text-muted">{subtitle}</p>

      <div className="mt-4 rounded-xl border border-bg-border bg-bg.card shadow-soft p-4">
        <div className="flex justify-between items-center text-xs text-text-secondary mb-3">
          <span>{`Step ${stepIndex + 1} of ${steps.length}`}</span>
          <span>{Math.round(pct)}% Complete</span>
        </div>
        <div className="h-1.5 w-full bg-bg.hover rounded-full overflow-hidden">
          <div className="h-full bg-text-brand" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 flex justify-between">
          {steps.map((s, i) => {
            const active = i <= stepIndex;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1 w-1/5">
                <div
                  className={clsx(
                    "h-8 w-8 rounded-full grid place-items-center",
                    active ? "bg-text-brand/15 text-text-brand" : "bg-bg.hover text-text-secondary",
                  )}
                >
                  {active ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                </div>
                <div
                  className={clsx(
                    "text-[11px] text-center",
                    active ? "text-white" : "text-text-secondary",
                  )}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
