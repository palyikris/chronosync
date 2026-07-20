import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const AppLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Expandable Sidebar */}
      <Sidebar />

      {/* Main Content Area - offset by collapsed sidebar width (80px / ml-20) */}
      <main className="flex-1 ml-20 p-8 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};
