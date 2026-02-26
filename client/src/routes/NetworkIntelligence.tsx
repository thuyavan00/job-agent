import { useState, useMemo } from "react";
import {
  Linkedin,
  Search,
  SlidersHorizontal,
  Users,
  TrendingUp,
  Mail,
  MessageSquare,
  Building2,
  MapPin,
  UserCheck,
  Clock,
  Briefcase,
  Target,
  Megaphone,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

type ContactRole = "Recruiter" | "Hiring Manager" | "Engineer" | "Director";
type ContactStatus = "not_contacted" | "message_sent" | "connected" | "replied";

interface Contact {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: ContactRole;
  title: string;
  company: string;
  location: string;
  isTargetCompany: boolean;
  mutualConnections: number;
  responseRate: number;
  status: ContactStatus;
  recentActivity: string;
  lastContacted?: string;
  aiSuggestion?: string;
}

/* ─── Mock Data ──────────────────────────────────────────── */

const MOCK_CONTACTS: Contact[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    initials: "SJ",
    avatarColor: "bg-purple-600",
    role: "Recruiter",
    title: "Senior Technical Recruiter",
    company: "TechCorp Innovation",
    location: "San Francisco, CA",
    isTargetCompany: true,
    mutualConnections: 12,
    responseRate: 85,
    status: "not_contacted",
    recentActivity: "Posted about React developer hiring",
    aiSuggestion:
      "Hi Sarah, I noticed you're actively hiring React developers. I'd love to learn more about the opportunities at TechCorp Innovation.",
  },
  {
    id: "2",
    name: "Mike Chen",
    initials: "MC",
    avatarColor: "bg-cyan-600",
    role: "Hiring Manager",
    title: "Engineering Manager",
    company: "StartupXYZ",
    location: "Austin, TX",
    isTargetCompany: true,
    mutualConnections: 8,
    responseRate: 72,
    status: "message_sent",
    recentActivity: "Shared article about team building",
    lastContacted: "2024-01-15",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    initials: "ER",
    avatarColor: "bg-green-600",
    role: "Recruiter",
    title: "Technical Sourcer",
    company: "Stripe",
    location: "New York, NY",
    isTargetCompany: true,
    mutualConnections: 5,
    responseRate: 91,
    status: "connected",
    recentActivity: "Updated their profile with new role",
    aiSuggestion:
      "Hi Emily, I see you're at Stripe — I've been following Stripe's engineering blog and I'm excited about the distributed systems work. Would love to connect!",
  },
  {
    id: "4",
    name: "David Park",
    initials: "DP",
    avatarColor: "bg-orange-600",
    role: "Director",
    title: "Director of Engineering",
    company: "Notion",
    location: "Remote",
    isTargetCompany: false,
    mutualConnections: 3,
    responseRate: 60,
    status: "not_contacted",
    recentActivity: "Liked a post about engineering culture",
    aiSuggestion:
      "Hi David, I've been a big fan of Notion's product vision. I'd love to chat about the engineering challenges you're solving.",
  },
];

/* ─── Role badge config ──────────────────────────────────── */

const ROLE_BADGE: Record<ContactRole, string> = {
  Recruiter: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  "Hiring Manager": "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  Engineer: "bg-green-500/15 text-green-400 border border-green-500/30",
  Director: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
};

/* ─── Status config ──────────────────────────────────────── */

const STATUS_CONFIG: Record<ContactStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  not_contacted: {
    label: "Not Contacted",
    icon: <Users size={13} />,
    cls: "text-text-2",
  },
  message_sent: {
    label: "Message Sent",
    icon: <Clock size={13} />,
    cls: "text-yellow-400",
  },
  connected: {
    label: "Connected",
    icon: <UserCheck size={13} />,
    cls: "text-green-400",
  },
  replied: {
    label: "Replied",
    icon: <MessageSquare size={13} />,
    cls: "text-cyan-400",
  },
};

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

/* ─── Contact Card ───────────────────────────────────────── */

function ContactCard({ contact }: { contact: Contact }) {
  const statusCfg = STATUS_CONFIG[contact.status];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${contact.avatarColor}`}
        >
          {contact.initials}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-semibold text-text">{contact.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[contact.role]}`}>
              {contact.role}
            </span>
            {contact.isTargetCompany && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
                <Target size={11} />
                Target Company
              </span>
            )}
          </div>

          {/* Title / Company / Location */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-2 mb-3">
            <span className="inline-flex items-center gap-1.5">
              <Briefcase size={13} />
              {contact.title}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={13} />
              {contact.company}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} />
              {contact.location}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-2 mb-3">
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} />
              {contact.mutualConnections} mutual connections
            </span>
            <span className="inline-flex items-center gap-1.5 text-green-400">
              <TrendingUp size={13} />
              {contact.responseRate}% response rate
            </span>
            <span className={`inline-flex items-center gap-1.5 ${statusCfg.cls}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
          </div>

          {/* Recent activity */}
          <p className="text-sm text-text-2">Recent: {contact.recentActivity}</p>
          {contact.lastContacted && (
            <p className="text-xs text-text-2 mt-0.5">Last contacted: {contact.lastContacted}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-white transition-colors">
            <Linkedin size={14} />
            Connect
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-text hover:bg-bg transition-colors">
            <MessageSquare size={14} />
            Message
          </button>
          {contact.role === "Recruiter" && (
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-text hover:bg-bg transition-colors">
              <Mail size={14} />
              Email
            </button>
          )}
        </div>
      </div>

      {/* AI Message Suggestion */}
      {contact.aiSuggestion && (
        <div className="mt-4 rounded-lg border border-border bg-bg p-4">
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-2">
            <MessageSquare size={14} />
            AI Message Suggestion
          </div>
          <p className="text-sm text-cyan-300">"{contact.aiSuggestion}"</p>
        </div>
      )}
    </div>
  );
}

/* ─── Placeholder tabs ───────────────────────────────────── */

function CompanyIntelTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Building2 size={48} className="text-text-2 mb-4" />
      <h3 className="text-lg font-semibold text-text mb-2">Company Intel</h3>
      <p className="text-text-2 text-sm max-w-sm">
        AI-powered insights on hiring activity, team growth signals, and company intelligence. Coming soon.
      </p>
    </div>
  );
}

function OutreachCampaignTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Megaphone size={48} className="text-text-2 mb-4" />
      <h3 className="text-lg font-semibold text-text mb-2">Outreach Campaigns</h3>
      <p className="text-text-2 text-sm max-w-sm">
        Manage and automate personalized outreach campaigns to recruiters and hiring managers. Coming soon.
      </p>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

type Tab = "contacts" | "company" | "outreach";

export default function NetworkIntelligence() {
  const [activeTab, setActiveTab] = useState<Tab>("contacts");
  const [search, setSearch] = useState("");

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return MOCK_CONTACTS;
    return MOCK_CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    );
  }, [search]);

  const stats = useMemo(() => {
    const total = MOCK_CONTACTS.length;
    const connected = MOCK_CONTACTS.filter((c) => c.status === "connected").length;
    const sent = MOCK_CONTACTS.filter((c) => c.status === "message_sent" || c.status === "replied").length;
    const replied = MOCK_CONTACTS.filter((c) => c.status === "replied").length;
    const rate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
    return { total, connected, sent, rate };
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Network Intelligence</h1>
          <p className="text-sm text-text-2 mt-1">AI-powered networking insights and recruiter intelligence</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-medium text-sm transition-colors">
          <Linkedin size={16} />
          Sync LinkedIn
        </button>
      </div>

      {/* KPI Stats */}
      <div className="flex gap-4 mb-8">
        <StatCard label="Total Contacts" value={stats.total} />
        <StatCard label="Connected" value={stats.connected} valueClass="text-green-400" />
        <StatCard label="Messages Sent" value={stats.sent} valueClass="text-cyan-400" />
        <StatCard label="Response Rate" value={`${stats.rate}%`} valueClass="text-purple-400" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-0">
          {(
            [
              { id: "contacts", label: "Smart Contacts" },
              { id: "company", label: "Company Intel" },
              { id: "outreach", label: "Outreach Campaign" },
            ] as { id: Tab; label: string }[]
          ).map((tab) => (
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
      {activeTab === "contacts" && (
        <div>
          {/* Search + Filter */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
              <input
                type="text"
                placeholder="Search contacts, companies, or titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-text placeholder:text-text-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border text-text text-sm hover:bg-bg transition-colors">
              <SlidersHorizontal size={15} />
              Filter
            </button>
          </div>

          {/* Contact Cards */}
          <div className="flex flex-col gap-4">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-16 text-text-2">No contacts match your search.</div>
            ) : (
              filteredContacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)
            )}
          </div>
        </div>
      )}

      {activeTab === "company" && <CompanyIntelTab />}
      {activeTab === "outreach" && <OutreachCampaignTab />}
    </div>
  );
}
