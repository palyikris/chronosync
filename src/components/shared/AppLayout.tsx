import React, { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { Sidebar } from "./Sidebar";
import { LiveTimerWidget } from "./LiveTimerWidget";
import { PageLoading } from "./PageLoading";
import { RunningTimer } from "./RunningTimer";
import { useActiveTimer } from "../../hooks/useActiveTimer";

const SIDEBAR_STORAGE_KEY = "chronosync:sidebar:collapsed";

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const timer = useActiveTimer();
  const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  const isMobileNavOpen = mobileNavPath === location.pathname;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });
  const showLiveTimerWidget =
    location.pathname === "/timesheet" &&
    profile?.show_timesheet_timer === true;
  const showRunningTimer = Boolean(timer.activeTimer) && !showLiveTimerWidget;

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
        onMobileClose={() => setMobileNavPath(null)}
      />

      <main
        className={`min-h-screen transition-[margin] duration-500 ease-[cubic-bezier(0.22,0.7,0.24,1)] ${
          isSidebarCollapsed ? "lg:ml-[5.25rem]" : "lg:ml-[16.75rem]"
        }`}
      >
        <header className={`sticky top-0 z-30 border-b border-border bg-surface/88 backdrop-blur-2xl lg:top-3 lg:mx-auto lg:mt-3 lg:max-w-[1440px] lg:border-0 lg:bg-transparent lg:px-7 lg:backdrop-blur-none xl:px-8 ${showRunningTimer ? "" : "lg:hidden"}`}>
          <div className="flex h-14 items-center justify-between px-3.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavPath(location.pathname)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-border-strong bg-white/65 text-text shadow-[0_1px_2px_rgba(75,87,57,0.05)] transition-[background-color,box-shadow,transform] duration-300 ease-out hover:bg-white hover:shadow-sm active:scale-[0.98]"
              aria-label={t("navigation.openNavigation")}
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
          </div>
          {showRunningTimer ? <RunningTimer timer={timer} /> : null}
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-3.5 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-7 xl:px-8">
          {showLiveTimerWidget ? <LiveTimerWidget timer={timer} /> : null}
          <div key={location.pathname} className="page-transition min-w-0">
            <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};
