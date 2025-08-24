import { type ReactNode } from "react";
import { clsx } from "clsx";

type Step = {
  label: string;
  icon: ReactNode; // pass a Lucide icon element
};

export default function StepperHeader({
  steps,
  current, // 0-based index
}: {
  steps: Step[];
  current: number;
}) {
  const pct = ((current + 1) / steps.length) * 100;

  return (
    <div className="rounded-xl border border-border bg-bg.card p-4">
      <div className="flex justify-between items-center text-xs text-text-2 mb-3">
        <span>{`Step ${current + 1} of ${steps.length}`}</span>
        <span>{Math.round(pct)}% Complete</span>
      </div>

      {/* progress bar */}
      <div className="relative h-2 rounded-full bg-[#2b2f35] overflow-hidden">
        {/* completed portion */}
        <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${pct}%` }} />
      </div>

      {/* step icons */}
      <div className="mt-5 flex justify-between">
        {steps.map((s, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          return (
            <div key={s.label} className="flex flex-col items-center gap-1 w-1/5">
              <div
                className={clsx(
                  "h-8 w-8 rounded-full grid place-items-center border",
                  isDone
                    ? "bg-[color:var(--color-accent)] border-transparent text-black"
                    : isCurrent
                    ? "bg-[#1a1f24] border-[#3a424b] text-white"
                    : "bg-[#1a1f24] border-[#2b333c] text-[#9fb2c2]",
                )}
                title={s.label}
              >
                {s.icon}
              </div>
              <div
                className={clsx(
                  "text-[11px] text-center",
                  isDone ? "text-[color:var(--color-accent)]" : "text-text-2",
                )}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
