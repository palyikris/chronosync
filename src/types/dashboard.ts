export interface DashboardKPIs {
  totalLoggedHours: number;
  activeLoggersCount: number;
  totalActiveMembers: number;
  capacityUtilizationPct: number;
}

export interface ClientProjectBreakdown {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  totalHours: number;
  percentage: number;
}

export interface ProjectUtilizationItem {
  projectId: string;
  projectName: string;
  estimatedHours: number;
  loggedHours: number;
  utilizationPct: number;
}

export interface ClientProjectUtilizationGroup {
  clientId: string;
  clientName: string;
  estimatedHours: number;
  loggedHours: number;
  utilizationPct: number;
  projects: ProjectUtilizationItem[];
}

export interface UserWorkBreakdown {
  userId: string;
  userName: string;
  userEmail?: string;
  totalHours: number;
  percentage: number;
}

export interface BreakdownItem {
  id: string;
  primaryLabel: string;
  secondaryLabel?: string;
  totalHours: number;
  percentage: number;
}

export interface DailyLoggingTrend {
  workDate: string; // YYYY-MM-DD
  totalHours: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  clientProjectBreakdown: ClientProjectBreakdown[];
  clientProjectUtilization: ClientProjectUtilizationGroup[];
  userBreakdown: UserWorkBreakdown[];
  dailyTrends: DailyLoggingTrend[];
}
