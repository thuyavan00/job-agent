import { createContext, useContext, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface FullBleedCtx {
  setFullBleed: (v: boolean) => void;
}
const FullBleedContext = createContext<FullBleedCtx>({ setFullBleed: () => {} });

export function useFullBleed() {
  return useContext(FullBleedContext);
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullBleed, setFullBleed] = useState(false);

  return (
    <FullBleedContext.Provider value={{ setFullBleed }}>
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <div className="flex flex-1 overflow-hidden">
          {/* Collapsible sidebar */}
          {sidebarOpen && <Sidebar />}

          {/* Main content: scrollable normally, or full-bleed for canvas pages */}
          <main
            className={`flex-1 h-full ${
              fullBleed ? "overflow-hidden" : "overflow-y-auto px-2"
            }`}
          >
            {fullBleed ? (
              <div className="h-full">{children}</div>
            ) : (
              <div className="mx-auto w-full max-w-[1100px] py-6">{children}</div>
            )}
          </main>
        </div>
      </div>
    </FullBleedContext.Provider>
  );
}
