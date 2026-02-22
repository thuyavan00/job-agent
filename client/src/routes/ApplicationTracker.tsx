import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  ExternalLink,
  Building2,
  MapPin,
  DollarSign,
  Video,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

type AppStatus = "applied" | "screening" | "interview" | "offer" | "rejected" | "withdrawn";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  salary?: string;
  status: AppStatus;
  appliedAt: string;
  source?: string;
  sourceUrl?: string;
  nextAction?: string;
  nextActionDate?: string;
  notes?: string;
}

/* ─── Status config ──────────────────────────────────────── */

const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; icon: React.ReactNode; badge: string; dot: string }
> = {
  applied: {
    label: "Applied",
    icon: <Clock size={13} />,
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    dot: "bg-blue-400",
  },
  screening: {
    label: "Screening",
    icon: <Phone size={13} />,
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    dot: "bg-orange-400",
  },
  interview: {
    label: "Interview",
    icon: <Video size={13} />,
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    dot: "bg-purple-400",
  },
  offer: {
    label: "Offer",
    icon: <CheckCircle size={13} />,
    badge: "bg-green-500/15 text-green-400 border-green-500/30",
    dot: "bg-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle size={13} />,
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: <XCircle size={13} />,
    badge: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    dot: "bg-gray-400",
  },
};

const ALL_STATUSES: AppStatus[] = ["applied", "screening", "interview", "offer", "rejected", "withdrawn"];

/* ─── Helpers ────────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ─── Status Badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: AppStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 flex-1 min-w-0">
      <div className="text-2xl font-bold text-text">{value}</div>
      <div className="text-xs text-text-2 mt-0.5">{label}</div>
    </div>
  );
}

/* ─── Add / Edit Modal ───────────────────────────────────── */


interface ModalProps {
  initial?: Application | null;
  onClose: () => void;
  onSaved: () => void;
}

function AppModal({ initial, onClose, onSaved }: ModalProps) {
  const [form, setForm] = useState({
    jobTitle: initial?.jobTitle ?? "",
    company: initial?.company ?? "",
    location: initial?.location ?? "",
    salary: initial?.salary ?? "",
    status: (initial?.status ?? "applied") as AppStatus,
    source: initial?.source ?? "",
    sourceUrl: initial?.sourceUrl ?? "",
    nextAction: initial?.nextAction ?? "",
    nextActionDate: initial?.nextActionDate
      ? new Date(initial.nextActionDate).toISOString().slice(0, 16)
      : "",
    appliedAt: initial?.appliedAt
      ? new Date(initial.appliedAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.jobTitle.trim() || !form.company.trim()) {
      setError("Job title and company are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        nextActionDate: form.nextActionDate || undefined,
      };
      if (initial) {
        await axios.patch(`/api/applications/${initial.id}`, payload);
      } else {
        await axios.post("/api/applications", payload);
      }
      onSaved();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-text">
            {initial ? "Edit Application" : "Add Application"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-2">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1.5">Job Title *</label>
              <input
                className="input-base w-full"
                placeholder="Senior Frontend Developer"
                value={form.jobTitle}
                onChange={(e) => set("jobTitle", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Company *</label>
              <input
                className="input-base w-full"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Location</label>
              <input
                className="input-base w-full"
                placeholder="San Francisco, CA"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Status</label>
              <select
                className="input-base w-full"
                value={form.status}
                onChange={(e) => set("status", e.target.value as AppStatus)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Salary Range</label>
              <input
                className="input-base w-full"
                placeholder="$100,000 - $130,000"
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Source</label>
              <input
                className="input-base w-full"
                placeholder="LinkedIn, Indeed, Referral…"
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Applied Date</label>
              <input
                type="date"
                className="input-base w-full"
                value={form.appliedAt}
                onChange={(e) => set("appliedAt", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Next Action</label>
              <input
                className="input-base w-full"
                placeholder="Technical Interview"
                value={form.nextAction}
                onChange={(e) => set("nextAction", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Next Action Date</label>
              <input
                type="datetime-local"
                className="input-base w-full"
                value={form.nextActionDate}
                onChange={(e) => set("nextActionDate", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1.5">Job URL</label>
              <input
                type="url"
                className="input-base w-full"
                placeholder="https://company.com/jobs/123"
                value={form.sourceUrl}
                onChange={(e) => set("sourceUrl", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1.5">Notes</label>
              <textarea
                className="input-base w-full resize-none"
                rows={3}
                placeholder="Any notes about this application…"
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
              {saving ? "Saving…" : initial ? "Save Changes" : "Add Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── View Modal ─────────────────────────────────────────── */

function ViewModal({ app, onClose, onEdit }: { app: Application; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-text">Application Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-2">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <div className="text-lg font-semibold text-text">{app.jobTitle}</div>
            <div className="text-sm text-text-2 flex items-center gap-1.5 mt-0.5">
              <Building2 size={13} />
              {app.company}
              {app.location && <><span className="text-border">·</span><MapPin size={13} />{app.location}</>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={app.status} />
            {app.salary && (
              <span className="inline-flex items-center gap-1 text-xs text-text-2 bg-surface-hover px-2.5 py-1 rounded-full border border-border">
                <DollarSign size={11} />
                {app.salary}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-text-2 mb-0.5">Applied</div>
              <div className="text-text">{formatDate(app.appliedAt)}</div>
            </div>
            {app.source && (
              <div>
                <div className="text-xs text-text-2 mb-0.5">Source</div>
                <div className="text-text">{app.source}</div>
              </div>
            )}
            {app.nextAction && (
              <div className="col-span-2">
                <div className="text-xs text-text-2 mb-0.5">Next Action</div>
                <div className="text-text">
                  {app.nextAction}
                  {app.nextActionDate && (
                    <span className="text-text-2 ml-1">· {formatDateTime(app.nextActionDate)}</span>
                  )}
                </div>
              </div>
            )}
            {app.notes && (
              <div className="col-span-2">
                <div className="text-xs text-text-2 mb-0.5">Notes</div>
                <div className="text-text text-sm leading-relaxed">{app.notes}</div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1 border-t border-border">
            {app.sourceUrl && (
              <a
                href={app.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-text-2 text-sm hover:bg-surface-hover transition-colors"
              >
                <ExternalLink size={14} />
                View Job
              </a>
            )}
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function ApplicationTracker() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppStatus | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [viewApp, setViewApp] = useState<Application | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get<Application[]>("/api/applications", { params });
      setApps(res.data);
    } catch {
      /* no-op */
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      await axios.delete(`/api/applications/${id}`);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* no-op */
    }
  }

  /* ── Stats ── */
  const total = apps.length;
  const counts: Record<AppStatus, number> = {
    applied: 0, screening: 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0,
  };
  for (const a of apps) counts[a.status]++;

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Application Tracker</h1>
          <p className="text-sm text-text-2 mt-0.5">Track and manage your job applications</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} />
          Add Application
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="Total" value={total} />
        <StatCard label="Applied" value={counts.applied} />
        <StatCard label="Screening" value={counts.screening} />
        <StatCard label="Interviews" value={counts.interview} />
        <StatCard label="Offers" value={counts.offer} />
        <StatCard label="Rejected" value={counts.rejected} />
      </div>

      {/* Search + Filter */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-2">
        <div className="flex items-center gap-2 flex-1 px-3 py-2">
          <Search size={15} className="text-text-2 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-2 outline-none"
            placeholder="Search companies or positions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative flex items-center shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppStatus | "")}
            className="appearance-none bg-surface-hover border border-border rounded-lg pl-3 pr-8 py-2 text-sm text-text outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 text-text-2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-2 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3.5 font-medium">Company &amp; Position</th>
              <th className="text-left px-4 py-3.5 font-medium">Status</th>
              <th className="text-left px-4 py-3.5 font-medium">Applied Date</th>
              <th className="text-left px-4 py-3.5 font-medium">Next Action</th>
              <th className="text-left px-4 py-3.5 font-medium">Source</th>
              <th className="text-left px-4 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-surface-hover rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : apps.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-text-2 py-16">
                  No applications found.{" "}
                  <button onClick={() => setShowAdd(true)} className="text-accent underline-offset-2 underline">
                    Add your first one
                  </button>
                </td>
              </tr>
            ) : (
              apps.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover/40 transition-colors"
                >
                  {/* Company & Position */}
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 size={14} className="text-text-2" />
                      </div>
                      <div>
                        <div className="font-medium text-text">{app.company}</div>
                        <div className="text-text-2 text-xs mt-0.5">{app.jobTitle}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-2">
                          {app.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              {app.location}
                            </span>
                          )}
                          {app.salary && (
                            <span className="flex items-center gap-1">
                              <DollarSign size={10} />
                              {app.salary}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <StatusBadge status={app.status} />
                  </td>

                  {/* Applied Date */}
                  <td className="px-4 py-4 text-text-2 whitespace-nowrap">
                    {formatDate(app.appliedAt)}
                  </td>

                  {/* Next Action */}
                  <td className="px-4 py-4">
                    {app.nextAction ? (
                      <div>
                        <div className="text-text text-xs font-medium">{app.nextAction}</div>
                        {app.nextActionDate && (
                          <div className="text-text-2 text-xs mt-0.5">
                            {formatDateTime(app.nextActionDate)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-2">—</span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-4">
                    {app.source ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-surface-hover border border-border text-text-2">
                        {app.source}
                      </span>
                    ) : (
                      <span className="text-text-2">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewApp(app)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-text-2 hover:text-text transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setEditApp(app)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-text-2 hover:text-text transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      {app.sourceUrl && (
                        <a
                          href={app.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-2 hover:text-text transition-colors"
                          title="Open job listing"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-2 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd && (
        <AppModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchApps();
          }}
        />
      )}

      {editApp && (
        <AppModal
          initial={editApp}
          onClose={() => setEditApp(null)}
          onSaved={() => {
            setEditApp(null);
            fetchApps();
          }}
        />
      )}

      {viewApp && (
        <ViewModal
          app={viewApp}
          onClose={() => setViewApp(null)}
          onEdit={() => {
            setEditApp(viewApp);
            setViewApp(null);
          }}
        />
      )}
    </div>
  );
}
