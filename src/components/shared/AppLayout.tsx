import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { LiveTimerWidget } from "./LiveTimerWidget";

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const showLiveTimerWidget = location.pathname === "/timesheet";

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Expandable Sidebar */}
      <Sidebar />

      {/* Main Content Area - offset by collapsed sidebar width (80px / ml-20) */}
      <main className="ml-20 min-h-screen flex-1 p-3 transition-all duration-300 sm:p-4 md:p-5 lg:p-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {showLiveTimerWidget ? (
            <div className="hidden lg:block">
              <LiveTimerWidget />
            </div>
          ) : null}
          <Outlet />
        </div>
      </main>
    </div>
  );
};
