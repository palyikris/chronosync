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

export interface DailyLoggingTrend {
  workDate: string; // YYYY-MM-DD
  totalHours: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  clientProjectBreakdown: ClientProjectBreakdown[];
  dailyTrends: DailyLoggingTrend[];
}
