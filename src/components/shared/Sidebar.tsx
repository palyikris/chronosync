import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Timer,
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRoleLabel } from "../../utils/getRoleLabel";
import type { NavItem } from "../../types/ui";

export const Sidebar: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Define navigation items mapped to Lucide Icons
  const mainNavItems: NavItem[] = [
    { to: "/timesheet", label: "Timesheets", icon: Clock },
    {
      to: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roleRequired: "company_admin",
    },
    {
      to: "/admin/users",
      label: "Team Members",
      icon: Users,
      roleRequired: "company_admin",
    },
    {
      to: "/admin/settings",
      label: "Company Settings",
      icon: Settings,
      roleRequired: "company_admin",
    },
    {
      to: "/super-admin/companies",
      label: "Companies",
      icon: Building2,
      roleRequired: "super_admin",
    },
  ];

  // Filter items based on user's active role
  const filteredNavItems = mainNavItems.filter((item) => {
    if (!item.roleRequired) return true;
    // Hide company settings from super_admins
    if (item.to === "/admin/settings" && profile?.role === "super_admin")
      return false;
    if (item.roleRequired === "super_admin")
      return profile?.role === "super_admin";
    if (item.roleRequired === "company_admin")
      return (
        profile?.role === "company_admin" || profile?.role === "super_admin"
      );
    return true;
  });

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed left-0 top-0 h-screen bg-bg border-r border-border-strong z-50 flex flex-col justify-between py-6 transition-all duration-300 ease-in-out shadow-sm ${
        isHovered ? "w-64" : "w-20"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center px-4 gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-strong flex items-center justify-center text-white shrink-0 shadow-sm">
          <Timer className="w-6 h-6 text-primary" />
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isHovered ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
          }`}
        >
          <h1 className="font-bold text-lg text-text whitespace-nowrap leading-tight">
            Chrono<span className="text-primary-strong">Sync</span>
          </h1>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider whitespace-nowrap">
            {profile?.role?.replace("_", " ") || "Portal"}
          </p>
        </div>
      </div>

      {/* Primary Navigation Links */}
      <nav className="flex flex-col gap-2 w-full px-3 mt-8">
        {filteredNavItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex items-center h-12 rounded-full transition-all duration-200 group overflow-hidden ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted hover:bg-border hover:text-text"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Icon Container (Fixed 80px width centering) */}
                  <div className="w-14 h-12 flex items-center justify-center shrink-0">
                    <IconComponent
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? "text-primary-foreground" : "text-muted"
                      }`}
                    />
                  </div>

                  {/* Text Label (Fades/expands on hover) */}
                  <span
                    className={`whitespace-nowrap text-sm tracking-wide transition-all duration-300 ${
                      isHovered
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4 pointer-events-none"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Settings & Sign Out */}
      <div className="flex flex-col gap-2 w-full px-3 mt-auto pt-4 border-t border-border-strong">
        {/* Profile Card (Expands on Sidebar Hover) */}
        <div className="flex items-center h-12 px-2 gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-primary-strong text-white flex items-center justify-center font-bold text-sm shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div
            className={`flex flex-col transition-all duration-300 overflow-hidden ${
              isHovered ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
            }`}
          >
            <span className="text-sm font-semibold text-text truncate">
              {profile?.full_name || "User Profile"}
            </span>
            <span className="text-xs text-gray-400 truncate">
              {getRoleLabel(profile?.role || "regular")}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="flex items-center h-12 rounded-full text-red-600 hover:bg-red-50 transition-all duration-200 group overflow-hidden w-full text-left"
        >
          <div className="w-14 h-12 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          </div>
          <span
            className={`whitespace-nowrap text-sm font-semibold tracking-wide transition-all duration-300 ${
              isHovered
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-4 pointer-events-none"
            }`}
          >
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
};
