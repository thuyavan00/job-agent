import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible sidebar */}
        {sidebarOpen && <Sidebar />}

        {/* Scrollable main content */}
        <main className="flex-1 h-full overflow-y-auto px-2">
          <div className="mx-auto w-full max-w-[1100px] py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
