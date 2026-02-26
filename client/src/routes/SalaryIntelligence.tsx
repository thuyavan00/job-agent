import { useState } from "react";
import {
  Calculator,
  TrendingUp,
  MessageSquare,
  BarChart2,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

/* ─── Types ─────────────────────────────────────────────── */

type Tab = "market" | "offers" | "negotiator" | "trends";

interface LocationSalary {
  city: string;
  experience: string;
  min: number;
  max: number;
  median: number;
  yoyGrowth: number;
}

/* ─── Mock Data ──────────────────────────────────────────── */

const LOCATION_DATA: LocationSalary[] = [
  { city: "San Francisco, CA", experience: "5-7 years experience", min: 130000, max: 180000, median: 155000, yoyGrowth: 8.5 },
  { city: "Austin, TX",        experience: "5-7 years experience", min: 110000, max: 150000, median: 130000, yoyGrowth: 12.3 },
  { city: "Remote",            experience: "5-7 years experience", min: 120000, max: 170000, median: 145000, yoyGrowth: 2.1 },
];

const COL_ADJUSTED_DATA = [
  { city: "San Francisco", salary: 155000 },
  { city: "New York",      salary: 148000 },
  { city: "Seattle",       salary: 142000 },
  { city: "Austin",        salary: 130000 },
  { city: "Remote",        salary: 145000 },
];

/* ─── Helpers ────────────────────────────────────────────── */

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US");
}

/* ─── Stat Card ──────────────────────────────────────────── */

function StatCard({
  label,
  value,
  valueClass = "text-text",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl px-6 py-5 flex-1 min-w-0 text-center">
      <div className={`text-3xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-sm text-text-2 mt-1">{label}</div>
    </div>
  );
}

/* ─── Range Bar ──────────────────────────────────────────── */

function RangeBar({ min, max, median }: { min: number; max: number; median: number }) {
  const pct = ((median - min) / (max - min)) * 100;
  return (
    <div className="relative h-1.5 rounded-full bg-border mt-2">
      <div
        className="absolute left-0 top-0 h-1.5 rounded-full bg-blue-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─── Location Card ──────────────────────────────────────── */

function LocationCard({ loc }: { loc: LocationSalary }) {
  const isHot = loc.yoyGrowth >= 5;
  return (
    <div className="bg-bg border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="font-semibold text-text">{loc.city}</div>
          <div className="text-xs text-text-2 mt-0.5">{loc.experience}</div>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${isHot ? "text-green-400" : "text-text-2"}`}>
          <TrendingUp size={12} />
          {loc.yoyGrowth > 0 ? "+" : ""}{loc.yoyGrowth}%
        </span>
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-text-2">
          <span>Range</span>
          <span className="text-text font-medium">{fmt(loc.min)} - {fmt(loc.max)}</span>
        </div>
        <div className="flex justify-between text-text-2">
          <span>Median</span>
          <span className="text-text font-medium">{fmt(loc.median)}</span>
        </div>
        <RangeBar min={loc.min} max={loc.max} median={loc.median} />
      </div>
    </div>
  );
}

/* ─── Offer Evaluation Tab ───────────────────────────────── */

interface Offer {
  id: string;
  title: string;
  company: string;
  percentile: number;
  offeredSalary: number;
  marketMedian: number;
  totalComp: number;
  benefitsValue: number;
  aiAnalysis: string;
}

const OFFERS: Offer[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp Innovation",
    percentile: 35,
    offeredSalary: 140000,
    marketMedian: 155000,
    totalComp: 165000,
    benefitsValue: 25000,
    aiAnalysis:
      "The offer is $15,000 below market median. You have strong negotiation potential of up to $15,000 based on your experience and the current market demand.",
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "StartupXYZ",
    percentile: 42,
    offeredSalary: 135000,
    marketMedian: 145000,
    totalComp: 165000,
    benefitsValue: 30000,
    aiAnalysis:
      "The offer is $10,000 below market median. Given the startup equity package and growth potential, consider negotiating base salary to $145,000 while retaining equity terms.",
  },
];

function OfferCard({ offer }: { offer: Offer }) {
  const gap = offer.offeredSalary - offer.marketMedian; // negative = below
  const salaryPct = Math.min((offer.offeredSalary / (offer.marketMedian * 1.3)) * 100, 100);
  const benefitsPct = Math.min((offer.benefitsValue / 40000) * 100, 100);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text text-lg">{offer.title}</span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
              NEGOTIATE
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-bg border border-border text-text-2">
              {offer.percentile}th percentile
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-text-2">
            <BarChart2 size={13} />
            {offer.company}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors">
            <MessageSquare size={14} />
            Negotiate
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-card border border-border text-text text-sm hover:bg-bg transition-colors">
            <BarChart2 size={14} />
            Details
          </button>
        </div>
      </div>

      {/* Salary columns */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Offered Salary",      value: offer.offeredSalary },
          { label: "Market Median",        value: offer.marketMedian },
          { label: "Total Compensation",   value: offer.totalComp },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-xs text-text-2 mb-1">{label}</div>
            <div className="text-xl font-bold text-text">{fmt(value)}</div>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div className="space-y-3 mb-5">
        {/* Salary vs Market */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-text-2">Salary vs Market</span>
            <span className="text-red-400 font-medium">{gap < 0 ? `-${fmt(Math.abs(gap))}` : `+${fmt(gap)}`}</span>
          </div>
          <div className="h-2 rounded-full bg-border">
            <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${salaryPct}%` }} />
          </div>
        </div>
        {/* Benefits Value */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-text-2">Benefits Value</span>
            <span className="text-text font-medium">{fmt(offer.benefitsValue)}</span>
          </div>
          <div className="h-2 rounded-full bg-border">
            <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${benefitsPct}%` }} />
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-1.5">
          <Info size={14} />
          AI Analysis
        </div>
        <p className="text-sm text-blue-300">{offer.aiAnalysis}</p>
      </div>
    </div>
  );
}

function OfferEvaluationTab() {
  return (
    <div className="flex flex-col gap-5">
      {OFFERS.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

/* ─── AI Negotiator Tab ──────────────────────────────────── */

function AiNegotiatorTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <MessageSquare size={48} className="text-text-2 mb-4" />
      <h3 className="text-lg font-semibold text-text mb-2">AI Negotiator</h3>
      <p className="text-text-2 text-sm max-w-sm">
        Get personalized negotiation scripts, counter-offer strategies, and real-time coaching. Coming soon.
      </p>
    </div>
  );
}

/* ─── Salary Trends Tab ──────────────────────────────────── */

const TREND_DATA = [
  { year: "2020", salary: 122000 },
  { year: "2021", salary: 128000 },
  { year: "2022", salary: 138000 },
  { year: "2023", salary: 148000 },
  { year: "2024", salary: 155000 },
];

const SKILLS_PREMIUM = [
  { skill: "TypeScript", pct: 15, color: "bg-green-400",  textColor: "text-green-400"  },
  { skill: "AWS",        pct: 12, color: "bg-blue-400",   textColor: "text-blue-400"   },
  { skill: "GraphQL",    pct: 10, color: "bg-purple-400", textColor: "text-purple-400" },
  { skill: "Docker",     pct: 8,  color: "bg-orange-400", textColor: "text-orange-400" },
];

function SalaryTrendsTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Line Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-text">5-Year Salary Trend</h2>
        <p className="text-sm text-text-2 mt-0.5 mb-5">Senior Frontend Developer salaries over time</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={TREND_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--color-text-2)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-text-2)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
              domain={[0, 180000]}
              ticks={[0, 40000, 80000, 120000, 160000]}
            />
            <Tooltip
              formatter={(v: number) => [fmt(v), "Median Salary"]}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text)",
              }}
            />
            <Line
              type="linear"
              dataKey="salary"
              stroke="#6366f1"
              strokeWidth={2}
              dot={<Dot r={5} fill="#6366f1" stroke="#fff" strokeWidth={2} />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Right — Skills Premium */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-text">Skills Premium Analysis</h2>
        <p className="text-sm text-text-2 mt-0.5 mb-6">Salary impact of different skills</p>
        <div className="flex flex-col gap-5">
          {SKILLS_PREMIUM.map(({ skill, pct, color, textColor }) => (
            <div key={skill}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text font-medium">{skill}</span>
                <span className={`text-sm font-semibold ${textColor}`}>+{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-border">
                <div
                  className={`h-2 rounded-full ${color} transition-all`}
                  style={{ width: `${(pct / 20) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Market Analysis Tab ────────────────────────────────── */

function MarketAnalysisTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Salary Ranges by Location */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-text">Salary Ranges by Location</h2>
        <p className="text-sm text-text-2 mt-0.5 mb-5">For Senior Frontend Developer positions</p>
        <div className="flex flex-col gap-4">
          {LOCATION_DATA.map((loc) => (
            <LocationCard key={loc.city} loc={loc} />
          ))}
        </div>
      </div>

      {/* Right — Cost-Adjusted Bar Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-text">Cost-Adjusted Salary Comparison</h2>
        <p className="text-sm text-text-2 mt-0.5 mb-5">Median salaries adjusted for cost of living</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={COL_ADJUSTED_DATA} barSize={48} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="city"
              tick={{ fill: "var(--color-text-2)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-text-2)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}k`}
              domain={[0, 180000]}
            />
            <Tooltip
              formatter={(v: number) => [fmt(v), "Adjusted Median"]}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text)",
              }}
            />
            <Bar dataKey="salary" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

const TABS: { id: Tab; label: string }[] = [
  { id: "market",     label: "Market Analysis" },
  { id: "offers",     label: "Offer Evaluation" },
  { id: "negotiator", label: "AI Negotiator" },
  { id: "trends",     label: "Salary Trends" },
];

export default function SalaryIntelligence() {
  const [activeTab, setActiveTab] = useState<Tab>("market");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Salary Intelligence</h1>
          <p className="text-sm text-text-2 mt-1">AI-powered salary analysis and negotiation assistance</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-medium text-sm transition-colors">
          <Calculator size={16} />
          Salary Calculator
        </button>
      </div>

      {/* KPI Stats */}
      <div className="flex gap-4 mb-8">
        <StatCard label="Market Median"        value="$155,000" valueClass="text-green-400" />
        <StatCard label="YoY Growth"           value="+8.5%"    valueClass="text-cyan-400" />
        <StatCard label="Offers to Review"     value={2}        valueClass="text-purple-400" />
        <StatCard label="Negotiation Potential" value="$25,000" valueClass="text-orange-400" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-text-2 hover:text-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "market"     && <MarketAnalysisTab />}
      {activeTab === "offers"     && <OfferEvaluationTab />}
      {activeTab === "negotiator" && <AiNegotiatorTab />}
      {activeTab === "trends"     && <SalaryTrendsTab />}
    </div>
  );
}
