import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { Sidebar } from "./Sidebar";
import { LiveTimerWidget } from "./LiveTimerWidget";

const SIDEBAR_STORAGE_KEY = "chronosync:sidebar:collapsed";

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });
  const showLiveTimerWidget =
    location.pathname === "/timesheet" &&
    profile?.show_timesheet_timer === true;

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const handleCollapsedChange = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  };

  return (
    <div className="app-content-grid min-h-screen bg-bg/45">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileNavOpen}
        onCollapsedChange={handleCollapsedChange}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/88 px-3.5 backdrop-blur-2xl lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-border-strong bg-white/65 text-text shadow-[0_1px_2px_rgba(75,87,57,0.05)] transition active:scale-95"
          aria-label="Open navigation"
        >
          <Menu className="h-[17px] w-[17px]" />
        </button>
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="chronosync-logo h-7 w-7 object-contain" />
          <span className="text-[13px] font-semibold tracking-[-0.015em]">
            Chrono<span className="text-primary-strong">Sync</span>
          </span>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-white/65 text-[11px] font-semibold text-text shadow-sm">
          {profile?.full_name?.charAt(0).toUpperCase() || "U"}
        </div>
      </header>

      <main
        className={`min-h-screen transition-[margin] duration-300 ease-out ${
          isSidebarCollapsed ? "lg:ml-[5.25rem]" : "lg:ml-[16.75rem]"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-3.5 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-7 xl:px-8">
          {showLiveTimerWidget ? <LiveTimerWidget /> : null}
          <div key={location.pathname} className="page-transition min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
