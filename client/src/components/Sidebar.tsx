import { NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@context/AuthContext";
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
  LogOut,
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="h-screen w-64 bg-bg border-r border-border flex flex-col">
      {/* top brand */}
      <div className="px-4 py-5 mb-2 border-b border-border">
        <div className="text-lg font-bold text-text">JobAgent Pro</div>
      </div>

      {/* nav */}
      <nav className="px-2 flex-1 overflow-y-auto">
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

      {/* footer */}
      <div className="px-3 py-3 border-t border-border">
        <ThemeToggle />

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-xs text-text-2 overflow-hidden text-ellipsis whitespace-nowrap flex-1">
            {user?.email}
            {user?.role === "admin" && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">
                admin
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 p-1.5 rounded-lg text-text-2 hover:text-text hover:bg-card transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
