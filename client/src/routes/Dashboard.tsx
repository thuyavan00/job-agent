import { useEffect, useState } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Briefcase,
  CalendarCheck,
  TrendingUp,
  Target,
  ArrowUpRight,
  CalendarClock,
} from "lucide-react";


interface StatCard {
  value: number | string;
  change: number;
}

interface DashboardStats {
  applicationsSent: StatCard;
  interviewsScheduled: StatCard;
  responseRate: StatCard;
  successRate: StatCard;
}

interface OverviewPoint {
  month: string;
  applications: number;
  interviews: number;
}

interface RecentApplication {
  id: string;
  jobTitle: string;
  company: string;
  salary: string | null;
  status: string;
  appliedAt: string;
}

interface UpcomingInterview {
  id: string;
  jobTitle: string;
  company: string;
  scheduledAt: string;
  prepStatus: string;
  initials: string;
}

interface DashboardData {
  stats: DashboardStats;
  overview: OverviewPoint[];
  recentApplications: RecentApplication[];
  upcomingInterviews: UpcomingInterview[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return hours <= 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function formatScheduled(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` at ${time}`;
}

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  interview: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  offer: "bg-green-500/15 text-green-400 border border-green-500/30",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/30",
  withdrawn: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const PREP_STYLES: Record<string, string> = {
  "prep-pending": "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  prepping: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  ready: "bg-green-500/15 text-green-400 border border-green-500/30",
};

const PREP_LABELS: Record<string, string> = {
  "prep-pending": "Prep Pending",
  prepping: "Prepping",
  ready: "Ready",
};

function StatCardItem({
  icon,
  label,
  value,
  change,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change: number;
  iconBg: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div className="text-text-2 text-sm">{label}</div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-text">{value}</span>
        {change !== 0 && (
          <span className="flex items-center gap-1 text-sm text-green-400 font-medium">
            <ArrowUpRight size={14} />+{change}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get<DashboardData>("/api/dashboard");
        setData(res.data);
      } catch (e) {
        setError("Failed to load dashboard data.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-36" />
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl h-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl h-64" />
          <div className="bg-card border border-border rounded-xl h-64" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-text-2">
        {error ?? "No data available."}
      </div>
    );
  }

  const { stats, overview, recentApplications, upcomingInterviews } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCardItem
          icon={<Briefcase size={18} className="text-cyan-400" />}
          label="Applications Sent"
          value={stats.applicationsSent.value}
          change={stats.applicationsSent.change}
          iconBg="bg-cyan-500/15"
        />
        <StatCardItem
          icon={<CalendarCheck size={18} className="text-blue-400" />}
          label="Interviews Scheduled"
          value={stats.interviewsScheduled.value}
          change={stats.interviewsScheduled.change}
          iconBg="bg-blue-500/15"
        />
        <StatCardItem
          icon={<TrendingUp size={18} className="text-emerald-400" />}
          label="Response Rate"
          value={stats.responseRate.value}
          change={stats.responseRate.change}
          iconBg="bg-emerald-500/15"
        />
        <StatCardItem
          icon={<Target size={18} className="text-purple-400" />}
          label="Success Rate"
          value={stats.successRate.value}
          change={stats.successRate.change}
          iconBg="bg-purple-500/15"
        />
      </div>

      {/* Application Overview chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-text font-semibold text-base">Application Overview</h2>
            <p className="text-text-2 text-sm mt-0.5">Monthly applications vs interviews</p>
          </div>
        </div>

        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={overview} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="appGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="intGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--color-border)"
                strokeOpacity={0.5}
                vertical={true}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--color-text-2)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-text-2)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text)",
                }}
                itemStyle={{ color: "var(--color-text-2)" }}
                cursor={{ stroke: "var(--color-border)" }}
              />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#appGradient)"
                name="Applications"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="interviews"
                stroke="#818cf8"
                strokeWidth={2}
                fill="url(#intGradient)"
                name="Interviews"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Recent Applications + Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Applications */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-text font-semibold text-base">Recent Applications</h2>
          <p className="text-text-2 text-sm mt-0.5 mb-4">Your latest job applications and their status</p>
          <div className="border-t border-border" />
          <div className="flex flex-col divide-y divide-border">
            {recentApplications.length === 0 ? (
              <p className="text-text-2 text-sm py-6 text-center">No applications yet.</p>
            ) : (
              recentApplications.map((app) => (
                <div key={app.id} className="flex items-center gap-3 py-4">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={16} className="text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-text text-sm font-medium truncate">{app.jobTitle}</div>
                    <div className="text-text-2 text-xs mt-0.5">
                      {app.company}
                      {app.salary ? ` • ${app.salary}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[app.status] ?? STATUS_STYLES.applied}`}
                    >
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                    <span className="text-text-2 text-xs">{timeAgo(app.appliedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-text font-semibold text-base">Upcoming Interviews</h2>
          <p className="text-text-2 text-sm mt-0.5 mb-4">Your scheduled interviews and preparation status</p>
          <div className="border-t border-border" />
          <div className="flex flex-col divide-y divide-border">
            {upcomingInterviews.length === 0 ? (
              <p className="text-text-2 text-sm py-6 text-center">No upcoming interviews.</p>
            ) : (
              upcomingInterviews.map((interview) => (
                <div key={interview.id} className="flex items-center gap-3 py-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0 text-indigo-300 text-xs font-bold">
                    {interview.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-text text-sm font-medium truncate">{interview.jobTitle}</div>
                    <div className="text-text-2 text-xs mt-0.5">{interview.company}</div>
                    <div className="flex items-center gap-1 text-text-2 text-xs mt-1">
                      <CalendarClock size={11} />
                      {formatScheduled(interview.scheduledAt)}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PREP_STYLES[interview.prepStatus] ?? PREP_STYLES["prep-pending"]}`}
                  >
                    {PREP_LABELS[interview.prepStatus] ?? interview.prepStatus}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
