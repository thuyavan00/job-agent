import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import axios from "axios";
import {
  Search,
  Settings,
  Trash2,
  Plus,
  Save,
  Play,
  X,
  Globe,
  Calendar,
  Filter,
  DollarSign,
  Send,
  Sparkles,
  Clock,
  Briefcase,
  Zap,
  Bot,
  CheckCircle,
  MapPin,
  Bookmark,
  FileText,
  Mail,
  MessageCircle,
  Bell,
} from "lucide-react";
import { useFullBleed } from "@components/Layout";

/* ──────────────────────────────── Types ──────────────────────────────────── */

type WorkflowNodeType = "trigger" | "condition" | "action";

interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  description: string;
  nodeType: WorkflowNodeType;
  subtype: string;
  setupStatus: "configured" | "needs_setup";
  config: Record<string, unknown>;
}

type WFNode = Node<WorkflowNodeData, "workflowNode">;

interface PaletteItem {
  subtype: string;
  label: string;
  description: string;
  nodeType: WorkflowNodeType;
  subtitle: string;
  defaultConfig?: Record<string, unknown>;
}

interface PaletteSection {
  category: WorkflowNodeType;
  title: string;
  items: PaletteItem[];
}

interface WorkflowMeta {
  id: string;
  name: string;
  mode: "manual" | "scheduled" | "triggered";
  status: string;
}

/* ─── Job portal options for "New Job Posted" dropdown ────────────────────── */

const JOB_PORTALS = [
  { value: "linkedin",   label: "LinkedIn",   description: "Professional network job board" },
  { value: "indeed",     label: "Indeed",     description: "Largest job search engine" },
  { value: "angellist",  label: "AngelList",  description: "Startup and tech jobs" },
  { value: "remotive",   label: "Remotive",   description: "Remote-first tech jobs" },
  { value: "arbeitnow",  label: "Arbeitnow",  description: "Broad tech job board" },
  { value: "greenhouse", label: "Greenhouse", description: "Stripe, Airbnb, Coinbase, Discord…" },
  { value: "lever",      label: "Lever",      description: "Cloudflare, Reddit, Linear, Retool…" },
] as const;

type PortalValue = (typeof JOB_PORTALS)[number]["value"];

/* Curated company lists (must match JobsService constants) */
const GREENHOUSE_COMPANIES = [
  "Stripe", "Airbnb", "Lyft", "Coinbase", "Discord",
  "Notion", "Brex", "Gusto", "Coda", "Rippling",
];
const LEVER_COMPANIES = [
  "Airtable", "Cloudflare", "Linear", "Retool", "Loom", "Reddit", "Intercom",
];

/* ──────────────────────────── Palette Config ─────────────────────────────── */

const PALETTE_SECTIONS: PaletteSection[] = [
  {
    category: "trigger",
    title: "Job Portals",
    items: [
      {
        subtype: "linkedin_jobs",
        label: "LinkedIn Jobs",
        description: "Monitor LinkedIn for new job postings",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
      {
        subtype: "indeed_jobs",
        label: "Indeed Jobs",
        description: "Monitor Indeed for new job postings",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
      {
        subtype: "angellist_jobs",
        label: "AngelList Jobs",
        description: "Monitor AngelList for startup opportunities",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
      {
        subtype: "company_careers",
        label: "Company Careers",
        description: "Monitor specific company career pages",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
      {
        subtype: "remotive_jobs",
        label: "Remotive Jobs",
        description: "Remote-first tech jobs — free public API",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
      {
        subtype: "arbeitnow_jobs",
        label: "Arbeitnow Jobs",
        description: "Broad tech job board — free public API",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
      {
        subtype: "greenhouse_jobs",
        label: "Greenhouse Jobs",
        description: "Stripe, Airbnb, Coinbase, Discord, Notion…",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
      {
        subtype: "lever_jobs",
        label: "Lever Jobs",
        description: "Cloudflare, Reddit, Linear, Retool, Intercom…",
        nodeType: "trigger",
        subtitle: "Job Portals",
      },
    ],
  },
  {
    category: "trigger",
    title: "Schedule",
    items: [
      {
        subtype: "daily_trigger",
        label: "Daily Trigger",
        description: "Run workflow daily at a specific time",
        nodeType: "trigger",
        subtitle: "Schedule",
      },
      {
        subtype: "weekly_trigger",
        label: "Weekly Trigger",
        description: "Run workflow weekly",
        nodeType: "trigger",
        subtitle: "Schedule",
      },
    ],
  },
  {
    category: "condition",
    title: "Logic",
    items: [
      {
        subtype: "job_filter",
        label: "Job Filter",
        description: "Filter jobs by salary, location, and other criteria",
        nodeType: "condition",
        subtitle: "Logic",
      },
      {
        subtype: "salary_check",
        label: "Salary Check",
        description: "Check if salary meets requirements",
        nodeType: "condition",
        subtitle: "Logic",
      },
      {
        subtype: "location_check",
        label: "Location Check",
        description: "Check if location is acceptable",
        nodeType: "condition",
        subtitle: "Logic",
      },
    ],
  },
  {
    category: "action",
    title: "Applications",
    items: [
      {
        subtype: "submit_application",
        label: "Submit Application",
        description: "Submit job application automatically",
        nodeType: "action",
        subtitle: "Applications",
      },
      {
        subtype: "save_job",
        label: "Save Job",
        description: "Save job to application tracker",
        nodeType: "action",
        subtitle: "Applications",
      },
      {
        subtype: "tailor_resume",
        label: "AI Tailor Resume",
        description: "Tailor resume to job description using AI",
        nodeType: "action",
        subtitle: "Applications",
      },
      {
        subtype: "generate_cover_letter",
        label: "Generate Cover Letter",
        description: "Generate personalized cover letter",
        nodeType: "action",
        subtitle: "Applications",
      },
    ],
  },
  {
    category: "action",
    title: "Communication",
    items: [
      {
        subtype: "send_email",
        label: "Send Email",
        description: "Send email notification or cold email",
        nodeType: "action",
        subtitle: "Communication",
      },
      {
        subtype: "linkedin_message",
        label: "LinkedIn Message",
        description: "Send LinkedIn connection request or message",
        nodeType: "action",
        subtitle: "Communication",
      },
      {
        subtype: "slack_notification",
        label: "Slack Notification",
        description: "Send notification to Slack channel",
        nodeType: "action",
        subtitle: "Communication",
      },
    ],
  },
];

const ALL_ITEMS = PALETTE_SECTIONS.flatMap((s) => s.items);

/* ────────────────────────────── Helpers ─────────────────────────────────── */

function getNodeIcon(subtype: string, size = 16): React.ReactNode {
  const map: Record<string, React.ReactNode> = {
    new_job_posted:  <Search size={size} />,
    linkedin_jobs:   <Globe size={size} />,
    indeed_jobs:     <Search size={size} />,
    angellist_jobs:  <Zap size={size} />,
    company_careers: <Briefcase size={size} />,
    remotive_jobs:   <Globe size={size} />,
    arbeitnow_jobs:  <Search size={size} />,
    greenhouse_jobs: <Briefcase size={size} />,
    lever_jobs:      <Briefcase size={size} />,
    daily_trigger: <Clock size={size} />,
    weekly_trigger: <Calendar size={size} />,
    job_filter: <Filter size={size} />,
    salary_check: <DollarSign size={size} />,
    location_check: <MapPin size={size} />,
    submit_application: <Send size={size} />,
    save_job: <Bookmark size={size} />,
    tailor_resume: <Sparkles size={size} />,
    generate_cover_letter: <FileText size={size} />,
    send_email: <Mail size={size} />,
    linkedin_message: <MessageCircle size={size} />,
    slack_notification: <Bell size={size} />,
  };
  return map[subtype] ?? <Zap size={size} />;
}

function iconBg(nodeType: WorkflowNodeType) {
  return {
    trigger: "bg-cyan-500/20 text-cyan-400",
    condition: "bg-yellow-500/20 text-yellow-400",
    action: "bg-blue-500/20 text-blue-400",
  }[nodeType];
}

function typeBadge(nodeType: WorkflowNodeType) {
  return {
    trigger: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
    condition: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
    action: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  }[nodeType];
}

function categoryChip(category: WorkflowNodeType) {
  return {
    trigger: "bg-cyan-500/20 text-cyan-300",
    condition: "bg-yellow-500/20 text-yellow-300",
    action: "bg-blue-500/20 text-blue-300",
  }[category];
}

/* ──────────────────────────── Custom Node Card ───────────────────────────── */

function WorkflowNodeCard({ id, data, selected }: NodeProps<WFNode>) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [id, setNodes, setEdges],
  );

  const isConfigured = data.setupStatus === "configured";

  const borderClass = {
    trigger:   selected ? "border-cyan-500 ring-1 ring-cyan-500/25"   : "border-cyan-500/40",
    condition: selected ? "border-yellow-500 ring-1 ring-yellow-500/25" : "border-yellow-500/40",
    action:    selected ? "border-blue-500 ring-1 ring-blue-500/25"   : "border-blue-500/40",
  }[data.nodeType];

  return (
    <div className={`bg-card border rounded-xl p-4 w-72 shadow-lg transition-all ${borderClass}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-border !border-2 !border-card"
      />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg(data.nodeType)}`}
          >
            {getNodeIcon(data.subtype)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-text text-sm leading-tight truncate">
              {data.label}
            </div>
            <div className="text-text-2 text-xs mt-0.5">{data.subtitle}</div>
          </div>
        </div>
        <div className="flex gap-0.5 flex-shrink-0 ml-1">
          <button
            className="p-1.5 rounded hover:bg-surface-hover text-text-2 hover:text-text transition-colors"
            title="Configure"
          >
            <Settings size={13} />
          </button>
          <button
            className="p-1.5 rounded hover:bg-red-500/20 text-text-2 hover:text-red-400 transition-colors"
            title="Delete node"
            onClick={handleDelete}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <p className="text-text-2 text-xs mb-3 leading-relaxed">{data.description}</p>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isConfigured
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
          }`}
        >
          {isConfigured && <CheckCircle size={10} />}
          {isConfigured ? "Configured" : "Needs Setup"}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge(data.nodeType)}`}>
          {data.nodeType}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-border !border-2 !border-card"
      />
    </div>
  );
}

const NODE_TYPES = { workflowNode: WorkflowNodeCard };

/* ────────────────────────────── Settings Panel ───────────────────────────── */

interface SettingsPanelProps {
  node: WFNode;
  onClose: () => void;
  onSave: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
}

function NodeSettingsPanel({ node, onClose, onSave }: SettingsPanelProps) {
  const d = node.data;
  const [label, setLabel] = useState(d.label);
  const [config, setConfig] = useState<Record<string, unknown>>(d.config ?? {});

  useEffect(() => {
    setLabel(d.label);
    setConfig(d.config ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const set = (key: string, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  /** Toggle a company name in/out of config.companies array */
  const toggleCompany = (company: string) => {
    const current = (config.companies as string[]) ?? [];
    const next = current.includes(company)
      ? current.filter((c) => c !== company)
      : [...current, company];
    set("companies", next);
  };

  const handleSave = () =>
    onSave(node.id, { label, config, setupStatus: "configured" });

  const s = d.subtype;

  return (
    <div className="w-80 flex-shrink-0 border-l border-border bg-bg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-text text-sm">Node Settings</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-hover text-text-2 hover:text-text transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Form fields */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Node Name — always shown */}
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Node Name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input-base"
          />
        </div>

        {/* ── New Job Posted: portal selector + generic filters ── */}
        {s === "new_job_posted" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Job Portal</label>
              <select
                value={(config.portal as PortalValue) ?? ""}
                onChange={(e) => set("portal", e.target.value)}
                className="input-base"
              >
                <option value="" disabled>Select a source…</option>
                {JOB_PORTALS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} — {p.description}
                  </option>
                ))}
              </select>
              <p className="text-text-2 text-[11px] mt-1">
                Filters the <span className="text-accent">GET /jobs</span> response by source
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input
                type="text"
                placeholder="React, Frontend, JavaScript"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)}
                className="input-base"
              />
              <p className="text-text-2 text-[11px] mt-1">Comma-separated, matches title or tags</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Location</label>
              <input
                type="text"
                placeholder="New York, Remote"
                value={(config.location as string) ?? ""}
                onChange={(e) => set("location", e.target.value)}
                className="input-base"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.remoteOnly}
                onChange={(e) => set("remoteOnly", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Remote only</span>
            </label>
          </>
        )}

        {/* ── LinkedIn Jobs ── */}
        {s === "linkedin_jobs" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitors <span className="text-text">LinkedIn</span> job postings matching your criteria.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="React, Frontend, JavaScript"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
              <p className="text-text-2 text-[11px] mt-1">Comma-separated, matches title or tags</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Location</label>
              <input type="text" placeholder="New York, Remote"
                value={(config.location as string) ?? ""}
                onChange={(e) => set("location", e.target.value)} className="input-base" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.remoteOnly}
                onChange={(e) => set("remoteOnly", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Remote only</span>
            </label>
          </>
        )}

        {/* ── Indeed Jobs ── */}
        {s === "indeed_jobs" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitors <span className="text-text">Indeed</span> — largest job search engine.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="Backend, Python, Go"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Location</label>
              <input type="text" placeholder="San Francisco, Remote"
                value={(config.location as string) ?? ""}
                onChange={(e) => set("location", e.target.value)} className="input-base" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.remoteOnly}
                onChange={(e) => set("remoteOnly", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Remote only</span>
            </label>
          </>
        )}

        {/* ── AngelList Jobs ── */}
        {s === "angellist_jobs" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitors <span className="text-text">AngelList</span> for startup and early-stage opportunities.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="Full-Stack, Startup, Seed"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Stage</label>
              <select value={(config.stage as string) ?? "any"}
                onChange={(e) => set("stage", e.target.value)} className="input-base">
                <option value="any">Any stage</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="series-b">Series B+</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.remoteOnly}
                onChange={(e) => set("remoteOnly", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Remote only</span>
            </label>
          </>
        )}

        {/* ── Company Careers ── */}
        {s === "company_careers" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitor the careers page of a specific company directly.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Company Name</label>
              <input type="text" placeholder="Stripe, Anthropic…"
                value={(config.company as string) ?? ""}
                onChange={(e) => set("company", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Careers Page URL</label>
              <input type="url" placeholder="https://company.com/careers"
                value={(config.careersUrl as string) ?? ""}
                onChange={(e) => set("careersUrl", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="Engineer, Frontend"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
            </div>
          </>
        )}

        {/* ── Remotive: keywords + remote filter ── */}
        {s === "remotive_jobs" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitors <span className="text-text">Remotive</span> — remote-first tech jobs.
              Returns up to 20 results per fetch.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="React, TypeScript, Node"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
              <p className="text-text-2 text-[11px] mt-1">Comma-separated, matches title or tags</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.remoteOnly}
                onChange={(e) => set("remoteOnly", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Remote only</span>
            </label>
          </>
        )}

        {/* ── Arbeitnow: keywords + location + remote ── */}
        {s === "arbeitnow_jobs" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitors <span className="text-text">Arbeitnow</span> — broad tech board.
              Returns up to 20 results per fetch.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="Backend, Python, Go"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Location</label>
              <input type="text" placeholder="Berlin, Remote"
                value={(config.location as string) ?? ""}
                onChange={(e) => set("location", e.target.value)} className="input-base" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.remoteOnly}
                onChange={(e) => set("remoteOnly", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Remote only</span>
            </label>
          </>
        )}

        {/* ── Greenhouse: keywords + company checkboxes ── */}
        {s === "greenhouse_jobs" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitors <span className="text-text">Greenhouse</span> job boards for the selected companies.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="Engineer, Frontend"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-2">
                Companies{" "}
                <span className="text-text-2 font-normal">(leave blank = all)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {GREENHOUSE_COMPANIES.map((co) => {
                  const checked = ((config.companies as string[]) ?? []).includes(co);
                  return (
                    <label key={co}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-border bg-card text-text-2 hover:border-border"
                      }`}
                    >
                      <input type="checkbox" checked={checked}
                        onChange={() => toggleCompany(co)} className="hidden" />
                      {checked && <CheckCircle size={11} className="flex-shrink-0" />}
                      <span className="truncate">{co}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Lever: keywords + company checkboxes ── */}
        {s === "lever_jobs" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Monitors <span className="text-text">Lever</span> job boards for the selected companies.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Keywords</label>
              <input type="text" placeholder="Engineer, Full-Stack"
                value={(config.keywords as string) ?? ""}
                onChange={(e) => set("keywords", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-2">
                Companies{" "}
                <span className="text-text-2 font-normal">(leave blank = all)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {LEVER_COMPANIES.map((co) => {
                  const checked = ((config.companies as string[]) ?? []).includes(co);
                  return (
                    <label key={co}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-border bg-card text-text-2 hover:border-border"
                      }`}
                    >
                      <input type="checkbox" checked={checked}
                        onChange={() => toggleCompany(co)} className="hidden" />
                      {checked && <CheckCircle size={11} className="flex-shrink-0" />}
                      <span className="truncate">{co}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Schedule triggers ── */}
        {["daily_trigger", "weekly_trigger"].includes(s) && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Time</label>
              <input type="time" value={(config.time as string) ?? "09:00"}
                onChange={(e) => set("time", e.target.value)} className="input-base" />
            </div>
            {s === "weekly_trigger" && (
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1.5">Day of Week</label>
                <select value={(config.dayOfWeek as string) ?? "monday"}
                  onChange={(e) => set("dayOfWeek", e.target.value)} className="input-base">
                  {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day) => (
                    <option key={day} value={day.toLowerCase()}>{day}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* ── Job Filter condition ── */}
        {s === "job_filter" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Min Salary ($)</label>
              <input type="number" placeholder="80000"
                value={(config.minSalary as string) ?? ""}
                onChange={(e) => set("minSalary", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Job Type</label>
              <select value={(config.jobType as string) ?? "any"}
                onChange={(e) => set("jobType", e.target.value)} className="input-base">
                <option value="any">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.remoteOnly}
                onChange={(e) => set("remoteOnly", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Remote only</span>
            </label>
          </>
        )}

        {/* ── Salary Check condition ── */}
        {s === "salary_check" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Minimum ($)</label>
              <input type="number" placeholder="100000"
                value={(config.minSalary as string) ?? ""}
                onChange={(e) => set("minSalary", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Maximum ($)</label>
              <input type="number" placeholder="200000"
                value={(config.maxSalary as string) ?? ""}
                onChange={(e) => set("maxSalary", e.target.value)} className="input-base" />
            </div>
          </>
        )}

        {/* ── Location Check condition ── */}
        {s === "location_check" && (
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Accepted Locations</label>
            <input type="text" placeholder="New York, San Francisco, Remote"
              value={(config.acceptedLocations as string) ?? ""}
              onChange={(e) => set("acceptedLocations", e.target.value)} className="input-base" />
            <p className="text-text-2 text-[11px] mt-1">Comma-separated list</p>
          </div>
        )}

        {/* ── AI Tailor Resume action ── */}
        {s === "tailor_resume" && (
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Tailoring Style</label>
            <select value={(config.style as string) ?? "standard"}
              onChange={(e) => set("style", e.target.value)} className="input-base">
              <option value="standard">Standard ATS</option>
              <option value="aggressive">Aggressive Matching</option>
              <option value="conservative">Conservative</option>
            </select>
          </div>
        )}

        {/* ── Submit Application action ── */}
        {s === "submit_application" && (
          <>
            <p className="text-text-2 text-[11px] -mt-1 leading-relaxed">
              Automatically submit job applications using your tailored resume and cover letter.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Application Mode</label>
              <select value={(config.mode as string) ?? "auto"}
                onChange={(e) => set("mode", e.target.value)} className="input-base">
                <option value="auto">Fully Automatic</option>
                <option value="review">Review Before Submit</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.includeCoverLetter}
                onChange={(e) => set("includeCoverLetter", e.target.checked)} className="accent-accent" />
              <span className="text-sm text-text-2">Include cover letter</span>
            </label>
          </>
        )}

        {/* ── Save Job action ── */}
        {s === "save_job" && (
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Default Status</label>
            <select value={(config.defaultStatus as string) ?? "applied"}
              onChange={(e) => set("defaultStatus", e.target.value)} className="input-base">
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
            </select>
          </div>
        )}

        {/* ── Generate Cover Letter action ── */}
        {s === "generate_cover_letter" && (
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Tone</label>
            <select value={(config.tone as string) ?? "professional"}
              onChange={(e) => set("tone", e.target.value)} className="input-base">
              <option value="professional">Professional</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="concise">Concise</option>
            </select>
          </div>
        )}

        {/* ── Send Email action ── */}
        {s === "send_email" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">To</label>
              <input type="text" placeholder="recruiter@company.com"
                value={(config.to as string) ?? ""}
                onChange={(e) => set("to", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Subject</label>
              <input type="text" placeholder="Application for {{job.title}}"
                value={(config.subject as string) ?? ""}
                onChange={(e) => set("subject", e.target.value)} className="input-base" />
            </div>
          </>
        )}

        {/* ── LinkedIn Message action ── */}
        {s === "linkedin_message" && (
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Message Type</label>
            <select value={(config.messageType as string) ?? "connection"}
              onChange={(e) => set("messageType", e.target.value)} className="input-base">
              <option value="connection">Connection Request</option>
              <option value="inmail">InMail</option>
            </select>
          </div>
        )}

        {/* ── Slack Notification action ── */}
        {s === "slack_notification" && (
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Webhook URL</label>
            <input type="text" placeholder="https://hooks.slack.com/services/…"
              value={(config.webhookUrl as string) ?? ""}
              onChange={(e) => set("webhookUrl", e.target.value)} className="input-base" />
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleSave}
          className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────── Inner Builder ──────────────────────────────── */

function WorkflowBuilderContent() {
  const { setFullBleed } = useFullBleed();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<WFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [workflow, setWorkflow] = useState<WorkflowMeta | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const nodeCounterRef = useRef(0);

  /* Activate full-bleed mode for this page */
  useEffect(() => {
    setFullBleed(true);
    return () => setFullBleed(false);
  }, [setFullBleed]);

  /* Load or create workflow on mount */
  useEffect(() => {
    async function init() {
      try {
        const { data: list } = await axios.get("/api/workflows");
        let wf: WorkflowMeta;

        if (list.length === 0) {
          const { data: created } = await axios.post("/api/workflows", {
            name: "Job Application Automation",
            mode: "manual",
          });
          wf = created;
        } else {
          wf = list[0];
        }
        setWorkflow(wf);

        const { data: full } = await axios.get(`/api/workflows/${wf.id}`);
        if (full.nodes?.length > 0) {
          const flowNodes: WFNode[] = full.nodes.map((n: Record<string, unknown>) => {
            const paletteItem = ALL_ITEMS.find((i) => i.subtype === n.subtype);
            const cfg = (n.config as Record<string, unknown>) ?? {};
            return {
              id: n.id as string,
              type: "workflowNode" as const,
              position: { x: (n.positionX as number) ?? 300, y: (n.positionY as number) ?? 100 },
              data: {
                label: n.label as string,
                subtitle: paletteItem?.subtitle ?? (n.type as string),
                description: paletteItem?.description ?? "",
                nodeType: n.type as WorkflowNodeType,
                subtype: n.subtype as string,
                setupStatus: n.setupStatus as "configured" | "needs_setup",
                config: cfg,
              },
            };
          });
          setNodes(flowNodes);
          nodeCounterRef.current = full.nodes.length;

          const flowEdges: Edge[] = full.edges.map((e: Record<string, unknown>) => ({
            id: e.id as string,
            source: typeof e.source === "string" ? e.source : (e.source as { id: string }).id,
            target: typeof e.target === "string" ? e.target : (e.target as { id: string }).id,
            label: (e.label as string) ?? undefined,
            type: "smoothstep",
            style: { stroke: "var(--color-border)", strokeWidth: 2 },
          }));
          setEdges(flowEdges);
        }
      } catch (err) {
        console.error("Failed to load workflow:", err);
      }
    }
    init();
  }, [setNodes, setEdges]);

  /* Connect nodes */
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            style: { stroke: "var(--color-border)", strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  /* Select node on click */
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  /* Add node by clicking "+" in palette */
  const addNodeFromPalette = useCallback(
    (item: PaletteItem) => {
      const id = `node-${Date.now()}`;
      const count = nodeCounterRef.current++;
      const newNode: WFNode = {
        id,
        type: "workflowNode",
        position: { x: 280 + (count % 2) * 40, y: 80 + count * 240 },
        data: {
          label: item.label,
          subtitle: item.subtitle,
          description: item.description,
          nodeType: item.nodeType,
          subtype: item.subtype,
          setupStatus: "needs_setup",
          config: item.defaultConfig ?? {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [setNodes],
  );

  /* Drop from palette onto canvas */
  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/workflownode");
      if (!raw) return;
      const item: PaletteItem = JSON.parse(raw);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = `node-${Date.now()}`;
      nodeCounterRef.current++;
      const newNode: WFNode = {
        id,
        type: "workflowNode",
        position,
        data: {
          label: item.label,
          subtitle: item.subtitle,
          description: item.description,
          nodeType: item.nodeType,
          subtype: item.subtype,
          setupStatus: "needs_setup",
          config: item.defaultConfig ?? {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [screenToFlowPosition, setNodes],
  );

  /* Save node settings */
  const handleNodeSettingsSave = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [setNodes],
  );

  /* Save workflow graph to backend */
  const handleSave = useCallback(async () => {
    if (!workflow) return;
    setIsSaving(true);
    try {
      await axios.put(`/api/workflows/${workflow.id}/graph`, {
        nodes: nodes.map((n) => ({
          id: n.id,
          label: n.data.label,
          type: n.data.nodeType,
          subtype: n.data.subtype,
          positionX: n.position.x,
          positionY: n.position.y,
          config: n.data.config,
          setupStatus: n.data.setupStatus,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          label: e.label ?? null,
        })),
      });
    } catch (err) {
      console.error("Failed to save workflow:", err);
    } finally {
      setIsSaving(false);
    }
  }, [workflow, nodes, edges]);

  /* Trigger test run */
  const handleTestRun = useCallback(async () => {
    if (!workflow) return;
    setIsRunning(true);
    try {
      await axios.post(`/api/workflows/${workflow.id}/runs`, {});
    } catch (err) {
      console.error("Failed to trigger run:", err);
    } finally {
      setTimeout(() => setIsRunning(false), 2000);
    }
  }, [workflow]);

  const selectedNode = selectedNodeId
    ? (nodes.find((n) => n.id === selectedNodeId) as WFNode | undefined)
    : undefined;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Left Sidebar: Node Palette ─── */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-border bg-bg overflow-hidden">
        {/* Header + tabs */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <h2 className="text-text font-semibold text-sm mb-3">Workflow Builder</h2>
          <div className="flex border border-border rounded-lg overflow-hidden">
            {(["manual", "ai"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab ? "bg-card text-text" : "text-text-2 hover:text-text"
                }`}
              >
                {tab === "manual" ? <Settings size={12} /> : <Bot size={12} />}
                {tab === "manual" ? "Manual" : "AI Assistant"}
              </button>
            ))}
          </div>
        </div>

        {/* Palette body */}
        {activeTab === "manual" ? (
          <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-4">
            {PALETTE_SECTIONS.map((section) => (
              <div key={section.category + section.title}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${categoryChip(section.category)}`}
                  >
                    {section.category}
                  </span>
                  <span className="text-text-2 text-xs font-medium">{section.title}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <div
                      key={item.subtype}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "application/workflownode",
                          JSON.stringify(item),
                        )
                      }
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border hover:border-accent/40 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg(item.nodeType)}`}
                      >
                        {getNodeIcon(item.subtype, 14)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-text text-xs font-medium truncate">{item.label}</div>
                        <div className="text-text-2 text-[10px] leading-tight mt-0.5 line-clamp-2">
                          {item.description}
                        </div>
                      </div>
                      <button
                        onClick={() => addNodeFromPalette(item)}
                        title={`Add ${item.label}`}
                        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-text-2 hover:text-text hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Bot size={24} className="text-accent" />
            </div>
            <div className="text-center">
              <p className="text-text text-sm font-medium mb-1">AI Workflow Assistant</p>
              <p className="text-text-2 text-xs leading-relaxed">
                Describe your automation goal and the AI will build the workflow for you.
              </p>
            </div>
            <textarea
              placeholder="e.g. Find React jobs on LinkedIn, filter for $100k+ salary, and auto-apply with my tailored resume..."
              className="input-base resize-none h-24 text-xs w-full"
            />
            <button className="w-full bg-accent hover:bg-accent/90 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Sparkles size={14} />
              Generate Workflow
            </button>
          </div>
        )}
      </aside>

      {/* ─── Center: Canvas ─── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-text font-medium text-sm">
              {workflow?.name ?? "Job Application Automation"}
            </span>
            <span className="bg-card border border-border text-text-2 text-xs px-2 py-0.5 rounded-md capitalize">
              {workflow?.mode ?? "Manual"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !workflow}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border text-text-2 hover:text-text hover:bg-card transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleTestRun}
              disabled={isRunning || !workflow}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Play size={14} fill="currentColor" />
              {isRunning ? "Running…" : "Test Run"}
            </button>
          </div>
        </div>

        {/* React Flow canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 overflow-hidden"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { stroke: "var(--color-border)", strokeWidth: 2 },
            }}
            style={{ background: "var(--color-canvas-bg, var(--color-bg))" }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="var(--color-border)"
            />
            <Controls
              showInteractive={false}
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* ─── Right Panel: Node Settings ─── */}
      {selectedNode && (
        <NodeSettingsPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onSave={handleNodeSettingsSave}
        />
      )}
    </div>
  );
}

/* ──────────────────────────── Exported Component ────────────────────────── */

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent />
    </ReactFlowProvider>
  );
}
