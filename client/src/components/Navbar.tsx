import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Sun, Moon, Bell, Search, LogOut, ChevronDown, Shield, UserCircle } from "lucide-react";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@context/AuthContext";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/profile": "My Profile",
  "/ai-job-match": "AI Job Match",
  "/resume-builder": "Resume Builder",
  "/workflow-builder": "Workflow Builder",
  "/application-tracker": "Application Tracker",
  "/interview-calendar": "Interview Calendar",
  "/network-intelligence": "Network Intelligence",
  "/salary-intelligence": "Salary Intelligence",
  "/skill-development": "Skill Development",
  "/interview-prep": "Interview Prep AI",
  "/career-analytics": "Career Analytics",
  "/browser-extension": "Browser Extension",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match for nested routes (e.g. /resume-builder/build)
  for (const [key, label] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/") || pathname.startsWith(key)) return label;
  }
  return "JobAgent Pro";
}

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export default function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  const initials = user ? getInitials(user.email) : "??";

  return (
    <header className="h-14 flex-shrink-0 flex items-center bg-bg border-b border-border z-20">
      {/* Brand — matches sidebar width */}
      <div className="w-64 flex-shrink-0 flex items-center gap-2.5 px-4">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm leading-none">J</span>
        </div>
        <span className="font-bold text-text text-base">JobAgent Pro</span>
      </div>

      {/* Hamburger + page title */}
      <div className="flex items-center gap-3 pl-4">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-text-2 hover:text-text hover:bg-card transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-text">{pageTitle}</h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2 pr-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            className="bg-card border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-text placeholder-text-2 focus:outline-none focus:border-accent w-48"
          />
        </div>

        {/* Theme toggle — icon only */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-2 hover:text-text hover:bg-card transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-text-2 hover:text-text hover:bg-card transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-card transition-colors"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-accent">{initials}</span>
            </div>
            {/* Name + email */}
            <div className="hidden md:flex flex-col items-start leading-tight max-w-[140px]">
              <span className="text-xs font-medium text-text truncate w-full">
                {user?.email?.split("@")[0]}
              </span>
              <span className="text-[10px] text-text-2 truncate w-full">{user?.email}</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-text-2 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-accent">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text truncate">
                      {user?.email?.split("@")[0]}
                    </div>
                    <div className="text-xs text-text-2 truncate">{user?.email}</div>
                  </div>
                </div>
                {user?.role === "admin" && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-purple-400">
                    <Shield size={11} />
                    Admin
                  </div>
                )}
              </div>

              {/* My Profile */}
              <button
                onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-2 hover:text-text hover:bg-border/30 transition-colors"
              >
                <UserCircle size={14} />
                My Profile
              </button>

              <div className="border-t border-border my-1" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-2 hover:text-text hover:bg-border/30 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
