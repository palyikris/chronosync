import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3Cog,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ScanEye,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { getRoleLabel } from "../../utils/getRoleLabel";
import type { NavItem } from "../../types/ui";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileClose: () => void;
}

type NavSectionId =
  | "workspace"
  | "operations"
  | "management"
  | "platform"
  | "personal";

type SectionedNavItem = NavItem & {
  section: NavSectionId;
};

const NAV_SECTION_ORDER: NavSectionId[] = [
  "workspace",
  "operations",
  "management",
  "platform",
  "personal",
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  isMobileOpen,
  onCollapsedChange,
  onMobileClose,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<NavSectionId>>(
    () => new Set(NAV_SECTION_ORDER),
  );

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 1023px)").matches);
  const asideRef = useRef<HTMLElement>(null);
  const onMobileCloseRef = useRef(onMobileClose);
  useEffect(() => { onMobileCloseRef.current = onMobileClose; }, [onMobileClose]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const handleChange = () => setIsMobile(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement;
    document.body.style.overflow = "hidden";
    const getControls = () => Array.from(asideRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [])
      .filter(element => element.getClientRects().length > 0 && !element.closest('[inert]'));
    const frame = requestAnimationFrame(() => getControls()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onMobileCloseRef.current();
      } else if (event.key === "Tab") {
        const controls = getControls();
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [isMobile, isMobileOpen]);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      window.alert(t("navigation.signOutFailed"));
    } finally {
      setIsSigningOut(false);
    }
  };

  const mainNavItems: SectionedNavItem[] = [
    {
      to: "/timesheet",
      label: t("navigation.timesheets"),
      icon: Clock,
      section: "workspace",
    },
    {
      to: "/leaves",
      label: t("navigation.leaveRequests"),
      icon: CalendarRange,
      section: "workspace",
    },
    {
      to: "/admin/dashboard",
      label: t("navigation.dashboard"),
      icon: LayoutDashboard,
      roleRequired: "company_admin",
      section: "workspace",
    },
    {
      to: "/admin/invoice-attachments",
      label: t("navigation.invoiceAttachments"),
      icon: FileSpreadsheet,
      roleRequired: "company_admin",
      section: "operations",
    },
    {
      to: "/admin/billing",
      label: t("navigation.automaticInvoicing"),
      icon: ReceiptText,
      roleRequired: "company_admin",
      section: "operations",
    },
    {
      to: "/admin/review",
      label: t("navigation.timesheetReview"),
      icon: ScanEye,
      roleRequired: "company_admin",
      section: "operations",
    },
    {
      to: "/admin/users",
      label: t("navigation.teamMembers"),
      icon: Users,
      roleRequired: "company_admin",
      section: "management",
    },
    {
      to: "/admin/settings",
      label: t("navigation.companySettings"),
      icon: Columns3Cog,
      roleRequired: "company_admin",
      section: "management",
    },
    {
      to: "/super-admin/companies",
      label: t("navigation.companies"),
      icon: Building2,
      roleRequired: "super_admin",
      section: "platform",
    },
    {
      to: "/super-admin/logs",
      label: t("navigation.logs"),
      icon: ScrollText,
      roleRequired: "super_admin",
      section: "platform",
    },
    {
      to: "/settings",
      label: t("navigation.userSettings"),
      icon: Settings,
      section: "personal",
    },
  ];

  const filteredNavItems = mainNavItems.filter((item) => {
    if (!item.roleRequired) return true;
    if (
      [
        "/admin/settings",
        "/admin/review",
        "/admin/dashboard",
        "/admin/invoice-attachments",
        "/admin/billing",
        "/leaves",
      ].includes(item.to) &&
      profile?.role === "super_admin"
    ) return false;
    if (item.roleRequired === "super_admin") return profile?.role === "super_admin";
    return profile?.role === "company_admin" || profile?.role === "super_admin";
  });

  const visibleSections = NAV_SECTION_ORDER.map((id) => ({
    id,
    label: t(`navigation.sections.${id}`),
    items: filteredNavItems.filter((item) => item.section === id),
  })).filter((section) => section.items.length > 0);

  const toggleSection = (sectionId: NavSectionId) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("navigation.closeNavigation")}
        onClick={onMobileClose}
        tabIndex={-1}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-text/24 backdrop-blur-[3px] transition-opacity duration-[400ms] lg:hidden ${
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={asideRef}
        inert={isMobile && !isMobileOpen}
        role={isMobile && isMobileOpen ? "dialog" : undefined}
        aria-modal={isMobile && isMobileOpen ? true : undefined}
        aria-label={t("navigation.openNavigation")}
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-surface-strong/94 shadow-[12px_0_36px_rgba(75,87,57,0.08)] backdrop-blur-2xl transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,0.7,0.24,1)] lg:inset-y-3 lg:left-3 lg:translate-x-0 lg:rounded-[20px] lg:border ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-17" : "lg:w-64"}`}
      >
        <div className="flex h-full flex-col">
          <div className={`flex h-16 items-center ${isCollapsed ? "px-4 lg:justify-center lg:px-2" : "px-4"}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-primary/25 shadow-[inset_0_0_0_1px_rgba(96,120,42,0.09)] transition-colors duration-[400ms] hover:bg-primary/35">
                <img src="/logo.png" alt="ChronoSync" className="chronosync-logo h-8 w-8 object-contain" />
              </div>
              <div className={`${isCollapsed ? "lg:hidden" : ""} min-w-0`}>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.02em] text-text">
                    Chrono<span className="text-primary-strong">Sync</span>
                  </div>
                  <p className="truncate text-[9px] font-medium uppercase tracking-[0.11em] text-muted">
                    {profile?.role?.replace("_", " ") || t("navigation.portal")}
                  </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-muted hover:bg-black/[0.04] hover:text-text lg:hidden"
              aria-label={t("navigation.closeNavigation")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-3.5 h-px bg-border" />

          <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 py-3">
            {visibleSections.map((section, sectionIndex) => {
              const isExpanded = expandedSections.has(section.id);
              const isActiveSection = section.items.some(
                (item) => item.to === location.pathname,
              );

              return (
                <section
                  key={section.id}
                  aria-labelledby={`nav-section-${section.id}`}
                  className={`relative rounded-xl transition-[background-color,box-shadow] duration-[400ms] ${
                    isActiveSection && !isCollapsed
                      ? "bg-primary/[0.10] shadow-[inset_0_0_0_1px_rgba(96,120,42,0.07)]"
                      : ""
                  } ${isCollapsed && sectionIndex > 0 ? "lg:pt-2" : ""}`}
                >
                  {isCollapsed && sectionIndex > 0 ? (
                    <span className="absolute inset-x-2 top-0 hidden h-px bg-border lg:block" />
                  ) : null}

                  <button
                    id={`nav-section-${section.id}`}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isExpanded}
                    className={`${isCollapsed ? "lg:hidden" : ""} group flex h-7 w-full items-center gap-2 px-2.5 text-left text-[9.5px] font-semibold uppercase tracking-[0.105em] text-muted/75 transition-colors hover:text-muted-strong`}
                  >
                    <span className="truncate">{section.label}</span>
                    <span className="h-px min-w-3 flex-1 bg-border/80" />
                    <ChevronDown
                      className={`h-3 w-3 shrink-0 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,0.7,0.24,1)] ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-[400ms] ease-[cubic-bezier(0.22,0.7,0.24,1)] ${
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    } ${
                      isCollapsed
                        ? "lg:grid-rows-[1fr] lg:opacity-100"
                        : ""
                    }`}
                  >
                    <div inert={!isExpanded && !(isCollapsed && !isMobile)} className={`flex min-h-0 flex-col gap-0.5 overflow-hidden ${isCollapsed ? "" : "px-1 pb-1"}`}>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onMobileClose}
                            title={isCollapsed ? item.label : undefined}
                            className={({ isActive }) =>
                              `group relative flex h-9 items-center rounded-[9px] transition-[background-color,color,box-shadow] duration-300 ease-out ${
                                isCollapsed
                                  ? "gap-2.5 px-2.5 lg:justify-center lg:gap-0 lg:px-0"
                                  : "gap-2.5 px-2"
                              } ${
                                isActive
                                  ? "bg-surface-strong/80 text-text shadow-[0_1px_4px_rgba(75,87,57,0.07),inset_0_0_0_1px_rgba(96,120,42,0.10)]"
                                  : "text-muted-strong hover:bg-white/45 hover:text-text"
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] transition-[background-color,color] duration-300 ease-out ${
                                    isActive
                                      ? "bg-primary/35 text-primary-strong"
                                      : "text-muted group-hover:bg-black/[0.035] group-hover:text-muted-strong"
                                  }`}
                                >
                                  <Icon
                                    className={`h-3.5 w-3.5 ${
                                      isActive ? "stroke-[2.2]" : "stroke-[1.8]"
                                    }`}
                                  />
                                </span>
                                <span className={`${isCollapsed ? "lg:hidden" : ""} truncate text-[12px] font-medium`}>
                                  {item.label}
                                </span>
                                {isActive && !isCollapsed ? (
                                  <span className="ml-auto h-1.5 w-1.5 animate-[badge-in_380ms_cubic-bezier(0.22,0.7,0.24,1)] rounded-full bg-primary-strong/60" />
                                ) : null}
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </nav>

          <div className="border-t border-border p-2.5">
            <div className={`mb-1 flex items-center rounded-xl border border-border bg-white/35 ${isCollapsed ? "gap-2.5 p-2.5 lg:justify-center lg:p-1.5" : "gap-2.5 p-2.5"}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/35 text-[11px] font-semibold text-text shadow-[inset_0_0_0_1px_rgba(75,87,57,0.07)]">
                {profile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className={`${isCollapsed ? "lg:hidden" : ""} min-w-0 flex-1`}>
                  <p className="truncate text-[12px] font-medium text-text">{profile?.full_name || "User Profile"}</p>
                  <p className="truncate text-[10px] text-muted">{getRoleLabel(profile?.role || "regular")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              title={isCollapsed ? t("navigation.signOut") : undefined}
              className={`flex h-8 w-full items-center rounded-[9px] text-danger transition hover:bg-danger-bg/70 ${isCollapsed ? "gap-2.5 px-2.5 lg:justify-center lg:gap-0 lg:px-0" : "gap-2.5 px-2.5"}`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={`${isCollapsed ? "lg:hidden" : ""} text-[12px] font-medium`}>{t("navigation.signOut")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onCollapsedChange(!isCollapsed)}
            className="absolute -right-2.5 top-5 hidden h-5 w-5 items-center justify-center rounded-full border border-border-strong bg-surface-strong text-muted shadow-sm transition hover:text-text lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>
      </aside>
    </>
  );
};
