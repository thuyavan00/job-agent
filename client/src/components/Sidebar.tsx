import { NavLink } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { LayoutGrid, FileText, Workflow, ListChecks, Calendar, Cog } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: <LayoutGrid size={18} /> },
  { to: "/ai-job-match", label: "AI Job Match", icon: <FileText size={18} /> },
  { to: "/resume-builder", label: "Resume Builder", icon: <FileText size={18} /> },
  { to: "/workflow-builder", label: "Workflow Builder", icon: <Workflow size={18} /> },
  { to: "/application-tracker", label: "Application Tracker", icon: <ListChecks size={18} /> },
  { to: "/interview-calendar", label: "Interview Calendar", icon: <Calendar size={18} /> },
  { to: "/settings", label: "Settings", icon: <Cog size={18} /> },
];

export default function Sidebar({ userEmail = "john@example.com" }: { userEmail?: string }) {
  return (
    <aside className="h-screen w-64 bg-bg border-r border-border flex flex-col">
      {/* top brand */}
      <div className="px-4 py-5 mb-5 border-b border-border">
        <div className="text-lg font-bold text-white">JobAgent Pro</div>
      </div>

      {/* nav */}
      <nav className="px-2 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm no-underline
                 ${isActive ? "bg-card text-white" : "text-text-2 hover:bg-card hover:text-text"}`
              }
            >
              {icon}
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* footer pinned at bottom */}
      <div className="px-3 py-3 border-t border-border">
        {/* theme toggle */}
        <ThemeToggle />

        {/* email line */}
        <div className="mt-3 text-xs text-text-2 w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {userEmail}
        </div>
      </div>
    </aside>
  );
}
