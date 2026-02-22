import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Building2,
  X,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { z } from "zod";
import {
  buildMonthGrid,
  groupByDateKey,
  addMonths,
  formatMonthYear,
  formatTime,
  toDateKey,
} from "../utils/calendarUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interview {
  id: string;
  jobTitle: string;
  company: string;
  scheduledAt: string;
  prepStatus: "prep-pending" | "prepping" | "ready";
  notes: string | null;
  initials?: string;
}

interface DashboardResponse {
  upcomingInterviews: Interview[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PREP_CONFIG: Record<
  Interview["prepStatus"],
  { label: string; badge: string; dot: string }
> = {
  "prep-pending": {
    label: "Prep Pending",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    dot: "bg-orange-400",
  },
  prepping: {
    label: "Prepping",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    dot: "bg-blue-400",
  },
  ready: {
    label: "Ready",
    badge: "bg-green-500/15 text-green-400 border border-green-500/30",
    dot: "bg-green-400",
  },
};

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const AddInterviewSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  // datetime-local produces "2026-02-22T09:00" — no Z suffix; validate as non-empty string
  scheduledAt: z.string().min(1, "Date and time is required"),
  prepStatus: z.enum(["prep-pending", "prepping", "ready"]),
  notes: z.string().optional(),
});

type AddInterviewForm = z.infer<typeof AddInterviewSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrepBadge({ status }: { status: Interview["prepStatus"] }) {
  const cfg = PREP_CONFIG[status] ?? PREP_CONFIG["prep-pending"];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
        cfg.badge
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

interface EventChipProps {
  interview: Interview;
  onClick: () => void;
}

function EventChip({ interview, onClick }: EventChipProps) {
  const dot = PREP_CONFIG[interview.prepStatus]?.dot ?? "bg-orange-400";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${interview.jobTitle} @ ${interview.company} — ${formatTime(interview.scheduledAt)}`}
      className="w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight
                 bg-accent/10 hover:bg-accent/20 text-text truncate transition-colors
                 flex items-center gap-1"
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
      <span className="truncate">
        {formatTime(interview.scheduledAt)} {interview.company}
      </span>
    </button>
  );
}

interface DayCellProps {
  dayNum: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  interviews: Interview[];
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
  onEventClick: (interview: Interview) => void;
}

function DayCell({
  dayNum,
  dateKey,
  isCurrentMonth,
  isToday,
  interviews,
  isSelected,
  onSelect,
  onEventClick,
}: DayCellProps) {
  const MAX_VISIBLE = 2;
  const overflow = interviews.length - MAX_VISIBLE;

  return (
    <div
      onClick={() => onSelect(dateKey)}
      className={clsx(
        "min-h-[80px] p-1.5 border-b border-r border-border cursor-pointer transition-colors flex flex-col gap-0.5",
        !isCurrentMonth && "opacity-30",
        isToday && "bg-accent/5",
        isSelected && "bg-surface-hover ring-1 ring-inset ring-accent/40",
        !isSelected && "hover:bg-surface-hover/60"
      )}
    >
      <div
        className={clsx(
          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
          isToday ? "bg-accent text-white" : "text-text-2"
        )}
      >
        {dayNum}
      </div>
      <div className="flex flex-col gap-0.5">
        {interviews.slice(0, MAX_VISIBLE).map((iv) => (
          <EventChip key={iv.id} interview={iv} onClick={() => onEventClick(iv)} />
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-text-2 pl-1">+{overflow} more</span>
        )}
      </div>
    </div>
  );
}

interface CalendarGridProps {
  year: number;
  month: number;
  interviews: Interview[];
  selectedDateKey: string | null;
  onSelectDay: (dateKey: string) => void;
  onEventClick: (interview: Interview) => void;
}

function CalendarGrid({
  year,
  month,
  interviews,
  selectedDateKey,
  onSelectDay,
  onEventClick,
}: CalendarGridProps) {
  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const byDate = useMemo(() => groupByDateKey(interviews), [interviews]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-xs font-medium text-text-2 py-2 border-r border-border last:border-r-0"
          >
            {wd}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.dateKey}
            dayNum={day.dayNum}
            dateKey={day.dateKey}
            isCurrentMonth={day.isCurrentMonth}
            isToday={day.isToday}
            interviews={byDate.get(day.dateKey) ?? []}
            isSelected={selectedDateKey === day.dateKey}
            onSelect={onSelectDay}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

interface DayDetailPanelProps {
  dateKey: string;
  interviews: Interview[];
  onAddInterview: (prefillDate: string) => void;
  onClose: () => void;
}

function DayDetailPanel({
  dateKey,
  interviews,
  onAddInterview,
  onClose,
}: DayDetailPanelProps) {
  // Parse as local time to avoid UTC-offset shifting the date
  const date = new Date(dateKey + "T00:00:00");

  return (
    <aside className="w-72 flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-border gap-2">
        <div>
          <div className="text-xs font-medium text-text-2 uppercase tracking-wide">
            {date.toLocaleDateString("en-US", { weekday: "long" })}
          </div>
          <div className="text-sm font-semibold text-text">
            {date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onAddInterview(dateKey)}
            className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors"
            title="Add interview on this day"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-2 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Interview list */}
      <div className="flex-1 overflow-y-auto">
        {interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[180px] px-6 text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-hover border border-border flex items-center justify-center">
              <CalendarDays size={20} className="text-text-2" />
            </div>
            <p className="text-sm text-text-2">No interviews on this day</p>
            <button
              onClick={() => onAddInterview(dateKey)}
              className="text-xs text-accent hover:underline underline-offset-2"
            >
              Schedule one
            </button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {interviews.map((iv) => (
              <div key={iv.id} className="px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-text leading-tight">
                    {iv.jobTitle}
                  </div>
                  <PrepBadge status={iv.prepStatus} />
                </div>
                <div className="flex items-center gap-1 text-xs text-text-2">
                  <Building2 size={11} />
                  {iv.company}
                </div>
                <div className="flex items-center gap-1 text-xs text-text-2">
                  <Clock size={11} />
                  {formatTime(iv.scheduledAt)}
                </div>
                {iv.notes && (
                  <p className="text-xs text-text-2 mt-1 leading-relaxed border-t border-border pt-1.5">
                    {iv.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

interface AddInterviewModalProps {
  prefillDate?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function AddInterviewModal({ prefillDate, onClose, onSaved }: AddInterviewModalProps) {
  const [form, setForm] = useState<AddInterviewForm>({
    jobTitle: "",
    company: "",
    scheduledAt: prefillDate ? `${prefillDate}T09:00` : "",
    prepStatus: "prep-pending",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof AddInterviewForm>(k: K, v: AddInterviewForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = AddInterviewSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axios.post("/api/interviews", {
        jobTitle: parsed.data.jobTitle,
        company: parsed.data.company,
        scheduledAt: new Date(parsed.data.scheduledAt).toISOString(),
        prepStatus: parsed.data.prepStatus,
        notes: parsed.data.notes || undefined,
      });
      onSaved();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-text">Schedule Interview</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1.5">
                Job Title *
              </label>
              <input
                className="input-base"
                placeholder="Senior Frontend Developer"
                value={form.jobTitle}
                onChange={(e) => set("jobTitle", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">
                Company *
              </label>
              <input
                className="input-base"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">
                Prep Status
              </label>
              <select
                className="input-base"
                value={form.prepStatus}
                onChange={(e) =>
                  set("prepStatus", e.target.value as Interview["prepStatus"])
                }
              >
                <option value="prep-pending">Prep Pending</option>
                <option value="prepping">Prepping</option>
                <option value="ready">Ready</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1.5">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                className="input-base"
                value={form.scheduledAt}
                onChange={(e) => set("scheduledAt", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1.5">
                Notes
              </label>
              <textarea
                className="input-base resize-none"
                rows={3}
                placeholder="Topics to prepare, interview format…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-text-2 text-sm hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Schedule Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="animate-pulse p-2 flex-1">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 bg-surface-hover rounded" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: 7 }).map((_, c) => (
            <div key={c} className="h-20 bg-surface-hover rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

function MonthEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-hover border border-border flex items-center justify-center">
        <Calendar size={28} className="text-text-2" />
      </div>
      <div>
        <p className="text-text font-medium">No interviews this month</p>
        <p className="text-text-2 text-sm mt-1">Schedule your first interview to get started</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={15} />
        Schedule Interview
      </button>
    </div>
  );
}

function APILimitationBanner() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-orange-400 mt-0.5">
      <AlertCircle size={11} />
      Showing next 5 upcoming interviews. Full history available after a backend update.
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 flex-1 min-w-[110px]">
      <div className="text-2xl font-bold text-text">{value}</div>
      <div className="text-xs text-text-2 mt-0.5">{label}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InterviewCalendar() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL params use 1-indexed months (1=January … 12=December) for human-readable URLs
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const selectedDateKey = searchParams.get("day"); // "YYYY-MM-DD" or null

  // Clamp to valid ranges
  const viewYear = isNaN(year) ? now.getFullYear() : year;
  const viewMonth =
    isNaN(month) || month < 1 || month > 12 ? now.getMonth() + 1 : month;

  // Data state
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get<DashboardResponse>("/api/dashboard");
      setInterviews(res.data.upcomingInterviews ?? []);
    } catch {
      setFetchError("Failed to load interviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const byDate = useMemo(() => groupByDateKey(interviews), [interviews]);
  const selectedDayInterviews = useMemo(
    () => (selectedDateKey ? (byDate.get(selectedDateKey) ?? []) : []),
    [byDate, selectedDateKey]
  );
  const hasAnyThisMonth = useMemo(() => {
    for (const [key] of byDate) {
      const [y, m] = key.split("-").map(Number);
      if (y === viewYear && m === viewMonth) return true;
    }
    return false;
  }, [byDate, viewYear, viewMonth]);

  const stats = useMemo(
    () => ({
      total: interviews.length,
      pending: interviews.filter((i) => i.prepStatus === "prep-pending").length,
      prepping: interviews.filter((i) => i.prepStatus === "prepping").length,
      ready: interviews.filter((i) => i.prepStatus === "ready").length,
    }),
    [interviews]
  );

  // ── Navigation ──────────────────────────────────────────────────────────────
  function navigateMonth(delta: number) {
    const { year: ny, month: nm } = addMonths(viewYear, viewMonth, delta);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("year", String(ny));
      next.set("month", String(nm));
      next.delete("day");
      return next;
    });
  }

  function selectDay(dateKey: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (prev.get("day") === dateKey) {
        next.delete("day"); // toggle off
      } else {
        next.set("day", dateKey);
      }
      return next;
    });
  }

  function goToToday() {
    setSearchParams({
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1),
    });
  }

  function closeDetailPanel() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("day");
      return next;
    });
  }

  function openAddModal(prefill?: string | null) {
    setPrefillDate(prefill ?? null);
    setShowAdd(true);
  }

  function closeAddModal() {
    setShowAdd(false);
    setPrefillDate(null);
  }

  function handleSaved() {
    closeAddModal();
    fetchInterviews(); // re-fetch to pick up newly created interview
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Interview Calendar</h1>
          <APILimitationBanner />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-lg border border-border text-sm text-text-2 hover:bg-surface-hover transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 text-text-2 hover:bg-surface-hover transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium text-text min-w-[140px] text-center">
              {formatMonthYear(viewYear, viewMonth)}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 text-text-2 hover:bg-surface-hover transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={() => openAddModal(selectedDateKey)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} />
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="Upcoming" value={stats.total} />
        <StatCard label="Prep Pending" value={stats.pending} />
        <StatCard label="Prepping" value={stats.prepping} />
        <StatCard label="Ready" value={stats.ready} />
      </div>

      {/* Main area: calendar + optional day detail panel */}
      <div
        className={clsx(
          "flex gap-4 min-h-[480px]",
          selectedDateKey ? "flex-col lg:flex-row" : "flex-col"
        )}
      >
        {/* Calendar panel */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {loading ? (
            <CalendarSkeleton />
          ) : fetchError ? (
            <div className="flex-1 flex items-center justify-center p-8 text-text-2 text-sm text-center">
              {fetchError}
            </div>
          ) : (
            <>
              <CalendarGrid
                year={viewYear}
                month={viewMonth}
                interviews={interviews}
                selectedDateKey={selectedDateKey}
                onSelectDay={selectDay}
                onEventClick={(iv) => {
                  // Select the day of the clicked event to open detail panel
                  selectDay(toDateKey(new Date(iv.scheduledAt)));
                }}
              />
              {!hasAnyThisMonth && (
                <MonthEmptyState onAdd={() => openAddModal(selectedDateKey)} />
              )}
            </>
          )}
        </div>

        {/* Day detail panel */}
        {selectedDateKey && !loading && !fetchError && (
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
              <DayDetailPanel
                dateKey={selectedDateKey}
                interviews={selectedDayInterviews}
                onAddInterview={(date) => openAddModal(date)}
                onClose={closeDetailPanel}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add Interview Modal */}
      {showAdd && (
        <AddInterviewModal
          prefillDate={prefillDate}
          onClose={closeAddModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
