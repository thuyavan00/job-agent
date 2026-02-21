import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { MapPin, ExternalLink, RefreshCw, Briefcase, ChevronLeft, ChevronRight, X } from "lucide-react";

const PAGE_SIZE = 9;

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  descriptionShort: string;
  url: string;
  postedAt: string;
  source: string;
  tags: string[];
}

interface Filters {
  location: string;
  type: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)].filter(Boolean).sort();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-xs text-text-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-input-bg border border-input-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent cursor-pointer"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-2 whitespace-nowrap">
      {source}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">
      {type}
    </span>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text truncate">{job.title}</div>
          <div className="text-sm text-text-2 mt-0.5 truncate">{job.company}</div>
        </div>
        <SourceBadge source={job.source} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-text-2">
          <MapPin size={12} />
          {job.location}
        </span>
        <span className="text-text-2 text-xs">·</span>
        <TypeBadge type={job.type} />
      </div>

      <p className="text-sm text-text-2 line-clamp-3 leading-relaxed">
        {job.descriptionShort}
      </p>

      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-md bg-border/30 border border-border text-text-2"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
        <span className="text-xs text-text-2">{formatRelativeDate(job.postedAt)}</span>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-card hover:bg-border/40 text-text border border-border transition-colors"
        >
          <ExternalLink size={13} />
          View Job
        </a>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-border/50 rounded w-3/4" />
          <div className="h-3 bg-border/30 rounded w-1/2" />
        </div>
        <div className="h-5 bg-border/30 rounded-full w-20" />
      </div>
      <div className="h-3 bg-border/30 rounded w-1/3" />
      <div className="space-y-1.5">
        <div className="h-3 bg-border/30 rounded w-full" />
        <div className="h-3 bg-border/30 rounded w-5/6" />
        <div className="h-3 bg-border/30 rounded w-4/6" />
      </div>
      <div className="flex gap-1">
        <div className="h-5 bg-border/30 rounded-md w-16" />
        <div className="h-5 bg-border/30 rounded-md w-20" />
        <div className="h-5 bg-border/30 rounded-md w-14" />
      </div>
      <div className="flex justify-between pt-2 border-t border-border">
        <div className="h-3 bg-border/30 rounded w-16" />
        <div className="h-7 bg-border/50 rounded-lg w-24" />
      </div>
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  from,
  to,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-sm text-text-2">
        Showing <span className="text-text font-medium">{from}–{to}</span> of{" "}
        <span className="text-text font-medium">{total}</span> jobs
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-border text-text-2 hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>

        <span className="text-sm text-text-2 px-2 tabular-nums">
          {page} / {totalPages}
        </span>

        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-border text-text-2 hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function JobMatch() {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ location: "", type: "", source: "" });
  const [page, setPage] = useState(1);
  const role = "Software Engineer";

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ jobs: Job[]; role: string }>("/api/jobs");
      setAllJobs(data.jobs);
      setPage(1);
    } catch {
      setError("Failed to load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  function setFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ location: "", type: "", source: "" });
    setPage(1);
  }

  const locationOptions = useMemo(() => uniq(allJobs.map((j) => j.location)), [allJobs]);
  const typeOptions = useMemo(() => uniq(allJobs.map((j) => j.type)), [allJobs]);
  const sourceOptions = useMemo(() => uniq(allJobs.map((j) => j.source)), [allJobs]);

  const filtered = useMemo(() => {
    return allJobs.filter((j) => {
      if (filters.location && j.location !== filters.location) return false;
      if (filters.type && j.type !== filters.type) return false;
      if (filters.source && j.source !== filters.source) return false;
      return true;
    });
  }, [allJobs, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);
  const paginated = filtered.slice(from - 1, to);

  const hasFilters = filters.location || filters.type || filters.source;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">AI Job Match</h1>
          <p className="text-text-2 mt-1 text-sm">
            Jobs matched to your profile · Detected role:
            <span className="ml-1 inline-flex items-center gap-1 text-accent font-medium">
              <Briefcase size={13} />
              {role}
            </span>
          </p>
        </div>

        <button
          onClick={loadJobs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-card hover:bg-border/40 text-text border border-border transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      {!loading && allJobs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-end gap-4">
          <FilterSelect
            label="Source"
            value={filters.source}
            options={sourceOptions}
            onChange={(v) => setFilter("source", v)}
          />
          <FilterSelect
            label="Type"
            value={filters.type}
            options={typeOptions}
            onChange={(v) => setFilter("type", v)}
          />
          <FilterSelect
            label="Location"
            value={filters.location}
            options={locationOptions}
            onChange={(v) => setFilter("location", v)}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border text-text-2 hover:bg-border/30 transition-colors self-end"
            >
              <X size={13} /> Clear
            </button>
          )}

          <span className="ml-auto text-xs text-text-2 self-end pb-2">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Jobs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
          : paginated.map((job) => <JobCard key={job.id} job={job} />)}
      </div>

      {/* Empty state (filtered) */}
      {!loading && !error && filtered.length === 0 && allJobs.length > 0 && (
        <div className="rounded-xl border border-border p-12 text-center text-text-2">
          <X size={28} className="mx-auto mb-3 opacity-40" />
          <div className="font-medium text-text">No jobs match these filters</div>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Empty state (no data) */}
      {!loading && !error && allJobs.length === 0 && (
        <div className="rounded-xl border border-border p-12 text-center text-text-2">
          <Briefcase size={32} className="mx-auto mb-3 opacity-40" />
          <div className="font-medium text-text">No jobs found</div>
          <div className="text-sm mt-1">Try refreshing or check back later.</div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          from={from}
          to={to}
          total={filtered.length}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  );
}
