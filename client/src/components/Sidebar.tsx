import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Sparkles,
  FileText,
  Workflow,
  ListChecks,
  Calendar,
  Network,
  DollarSign,
  BookOpen,
  MessageSquare,
  BarChart2,
  Puzzle,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutGrid size={18} />, end: true },
  { to: "/ai-job-match", label: "AI Job Match", icon: <Sparkles size={18} />, end: false },
  { to: "/resume-builder", label: "Resume Builder", icon: <FileText size={18} />, end: false },
  { to: "/workflow-builder", label: "Workflow Builder", icon: <Workflow size={18} />, end: false },
  { to: "/application-tracker", label: "Application Tracker", icon: <ListChecks size={18} />, end: false },
  { to: "/interview-calendar", label: "Interview Calendar", icon: <Calendar size={18} />, end: false },
  { to: "/network-intelligence", label: "Network Intelligence", icon: <Network size={18} />, end: false },
  { to: "/salary-intelligence", label: "Salary Intelligence", icon: <DollarSign size={18} />, end: false },
  { to: "/skill-development", label: "Skill Development", icon: <BookOpen size={18} />, end: false },
  { to: "/interview-prep", label: "Interview Prep AI", icon: <MessageSquare size={18} />, end: false },
  { to: "/career-analytics", label: "Career Analytics", icon: <BarChart2 size={18} />, end: false },
  { to: "/browser-extension", label: "Browser Extension", icon: <Puzzle size={18} />, end: false },
];

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 h-full bg-bg border-r border-border overflow-y-auto">
      <nav className="px-2 py-3">
        <div className="flex flex-col gap-0.5">
          {links.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm no-underline transition-colors
                 ${isActive ? "bg-card text-text" : "text-text-2 hover:bg-card hover:text-text"}`
              }
            >
              {icon}
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}
