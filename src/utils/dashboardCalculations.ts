import type {
  ClientProjectBreakdown,
  ClientProjectUtilizationGroup,
  DailyLoggingTrend,
  DashboardData,
  UserWorkBreakdown,
} from "../types/dashboard";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DEFAULT_WEEKLY_WORK_HOURS = 40;

const padDatePart = (value: number) => String(value).padStart(2, "0");

const roundToOneDecimal = (value: number) =>
  Math.round((value + Number.EPSILON) * 10) / 10;

const getFiniteNonNegativeNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
};

export const formatDashboardDate = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const parseDashboardDate = (value: string): Date | null => {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

export const isValidDashboardDate = (value: string) =>
  parseDashboardDate(value) !== null;

export const isValidDashboardDateRange = (
  startDate: string,
  endDate: string,
) => {
  const parsedStartDate = parseDashboardDate(startDate);
  const parsedEndDate = parseDashboardDate(endDate);

  return Boolean(
    parsedStartDate &&
      parsedEndDate &&
      parsedStartDate.getTime() <= parsedEndDate.getTime(),
  );
};

export const getCurrentMonthDateRange = (today = new Date()) => ({
  startDate: formatDashboardDate(
    new Date(today.getFullYear(), today.getMonth(), 1, 12),
  ),
  endDate: formatDashboardDate(
    new Date(today.getFullYear(), today.getMonth() + 1, 0, 12),
  ),
});

export const getEndOfMonthForDashboardDate = (value: string) => {
  const date = parseDashboardDate(value);
  if (!date) return value;

  return formatDashboardDate(
    new Date(date.getFullYear(), date.getMonth() + 1, 0, 12),
  );
};

export const getDashboardDateRange = (
  startDate: string,
  endDate: string,
) => {
  if (!isValidDashboardDateRange(startDate, endDate)) return [];

  const dates: string[] = [];
  const cursor = parseDashboardDate(startDate)!;
  const lastDate = parseDashboardDate(endDate)!;

  while (cursor <= lastDate) {
    dates.push(formatDashboardDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

export const getDashboardWorkingDayCount = (
  startDate: string,
  endDate: string,
) =>
  getDashboardDateRange(startDate, endDate).filter((dateValue) => {
    const day = parseDashboardDate(dateValue)!.getDay();
    return day !== 0 && day !== 6;
  }).length;

/**
 * Converts a date range into the equivalent number of calendar months.
 * A complete month is 1; partial months are prorated by calendar day.
 */
export const getMonthlyEstimateFactor = (
  startDate: string,
  endDate: string,
) => {
  if (!isValidDashboardDateRange(startDate, endDate)) return 0;

  const rangeStart = parseDashboardDate(startDate)!;
  const rangeEnd = parseDashboardDate(endDate)!;
  const cursor = new Date(
    rangeStart.getFullYear(),
    rangeStart.getMonth(),
    1,
    12,
  );
  let factor = 0;

  while (cursor <= rangeEnd) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const selectedStartDay =
      year === rangeStart.getFullYear() && month === rangeStart.getMonth()
        ? rangeStart.getDate()
        : 1;
    const selectedEndDay =
      year === rangeEnd.getFullYear() && month === rangeEnd.getMonth()
        ? rangeEnd.getDate()
        : daysInMonth;

    factor += (selectedEndDay - selectedStartDay + 1) / daysInMonth;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return factor;
};

export interface DashboardProfileRow {
  id: string;
  weekly_work_hours: number | string | null;
}

interface RelatedClientRow {
  id: string;
  name: string | null;
}

interface RelatedProjectRow {
  id: string;
  name: string | null;
}

interface RelatedProfileRow {
  id: string;
  full_name: string | null;
}

export interface DashboardProjectRow {
  id: string;
  client_id: string;
  name: string | null;
  estimated_hours_per_month: number | string | null;
  clients: RelatedClientRow | RelatedClientRow[] | null;
}

export interface DashboardTimesheetRow {
  id: string;
  user_id: string;
  work_date: string;
  hours_logged: number | string | null;
  client_id: string;
  project_id: string;
  clients: RelatedClientRow | RelatedClientRow[] | null;
  projects: RelatedProjectRow | RelatedProjectRow[] | null;
  profiles: RelatedProfileRow | RelatedProfileRow[] | null;
}

interface DashboardFallbackLabels {
  unknown: string;
  unassignedClient: string;
  generalProject: string;
  unknownUser: string;
}

interface AggregateDashboardDataParams {
  activeProfiles: DashboardProfileRow[];
  activeProjects: DashboardProjectRow[];
  timesheetEntries: DashboardTimesheetRow[];
  startDate: string;
  endDate: string;
  labels: DashboardFallbackLabels;
}

const unwrapRelation = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

export const calculateExpectedCapacityHours = (
  activeProfiles: DashboardProfileRow[],
  startDate: string,
  endDate: string,
) => {
  const workingDayCount = getDashboardWorkingDayCount(startDate, endDate);
  const dailyCapacity = activeProfiles.reduce((total, profile) => {
    const configuredHours = Number(profile.weekly_work_hours);
    const weeklyHours =
      Number.isFinite(configuredHours) && configuredHours > 0
        ? configuredHours
        : DEFAULT_WEEKLY_WORK_HOURS;

    return total + weeklyHours / 5;
  }, 0);

  return roundToOneDecimal(dailyCapacity * workingDayCount);
};

export const aggregateDashboardData = ({
  activeProfiles,
  activeProjects,
  timesheetEntries,
  startDate,
  endDate,
  labels,
}: AggregateDashboardDataParams): DashboardData => {
  const totalLoggedHours = timesheetEntries.reduce(
    (sum, entry) => sum + getFiniteNonNegativeNumber(entry.hours_logged),
    0,
  );
  const activeProfileIds = new Set(activeProfiles.map((profile) => profile.id));
  const activeLoggingUserIds = new Set(
    timesheetEntries
      .map((entry) => entry.user_id)
      .filter((userId) => activeProfileIds.has(userId)),
  );
  const totalActiveMembers = activeProfiles.length;
  const activeLoggersCount = activeLoggingUserIds.size;
  const expectedCapacityHours = calculateExpectedCapacityHours(
    activeProfiles,
    startDate,
    endDate,
  );
  const capacityUtilizationPct =
    expectedCapacityHours > 0
      ? Math.round((totalLoggedHours / expectedCapacityHours) * 100)
      : 0;
  const activeLoggerRatePct =
    totalActiveMembers > 0
      ? Math.round((activeLoggersCount / totalActiveMembers) * 100)
      : 0;
  const estimateFactor = getMonthlyEstimateFactor(startDate, endDate);

  const breakdownMap = new Map<string, ClientProjectBreakdown>();
  const userBreakdownMap = new Map<string, UserWorkBreakdown>();
  const dailyMap = new Map<string, number>();
  const projectUtilizationMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      projectId: string;
      projectName: string;
      estimatedHours: number;
      loggedHours: number;
    }
  >();
  const clientUtilizationMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      estimatedHours: number;
      loggedHours: number;
      projects: Array<{
        projectId: string;
        projectName: string;
        estimatedHours: number;
        loggedHours: number;
      }>;
    }
  >();

  activeProjects.forEach((projectRow) => {
    const projectClient = unwrapRelation(projectRow.clients);
    const clientId = projectRow.client_id;
    const clientName = projectClient?.name || labels.unknown;
    const projectId = projectRow.id;
    const projectName = projectRow.name || labels.unknown;
    const estimatedHours =
      getFiniteNonNegativeNumber(projectRow.estimated_hours_per_month) *
      estimateFactor;

    projectUtilizationMap.set(projectId, {
      clientId,
      clientName,
      projectId,
      projectName,
      estimatedHours,
      loggedHours: 0,
    });

    if (!clientUtilizationMap.has(clientId)) {
      clientUtilizationMap.set(clientId, {
        clientId,
        clientName,
        estimatedHours: 0,
        loggedHours: 0,
        projects: [],
      });
    }

    const clientGroup = clientUtilizationMap.get(clientId)!;
    clientGroup.estimatedHours += estimatedHours;
    clientGroup.projects.push({
      projectId,
      projectName,
      estimatedHours,
      loggedHours: 0,
    });
  });

  timesheetEntries.forEach((entry) => {
    const hours = getFiniteNonNegativeNumber(entry.hours_logged);
    const client = unwrapRelation(entry.clients);
    const project = unwrapRelation(entry.projects);
    const profile = unwrapRelation(entry.profiles);
    const clientId = entry.client_id;
    const projectId = entry.project_id;
    const clientName = client?.name || labels.unassignedClient;
    const projectName = project?.name || labels.generalProject;
    const userName = profile?.full_name || labels.unknownUser;
    const breakdownKey = `${clientId}:${projectId}`;

    if (!breakdownMap.has(breakdownKey)) {
      breakdownMap.set(breakdownKey, {
        clientId,
        clientName,
        projectId,
        projectName,
        totalHours: 0,
        percentage: 0,
      });
    }
    breakdownMap.get(breakdownKey)!.totalHours += hours;

    if (!userBreakdownMap.has(entry.user_id)) {
      userBreakdownMap.set(entry.user_id, {
        userId: entry.user_id,
        userName,
        totalHours: 0,
        percentage: 0,
      });
    }
    userBreakdownMap.get(entry.user_id)!.totalHours += hours;

    dailyMap.set(entry.work_date, (dailyMap.get(entry.work_date) ?? 0) + hours);

    const utilizationProject = projectUtilizationMap.get(entry.project_id);
    if (!utilizationProject) return;

    utilizationProject.loggedHours += hours;
    const utilizationClient = clientUtilizationMap.get(
      utilizationProject.clientId,
    );
    if (!utilizationClient) return;

    utilizationClient.loggedHours += hours;
    const clientProject = utilizationClient.projects.find(
      (item) => item.projectId === utilizationProject.projectId,
    );
    if (clientProject) clientProject.loggedHours += hours;
  });

  const toPercentageOfTotal = (hours: number) =>
    totalLoggedHours > 0
      ? roundToOneDecimal((hours / totalLoggedHours) * 100)
      : 0;

  const clientProjectBreakdown = Array.from(breakdownMap.values())
    .map((item) => ({
      ...item,
      totalHours: roundToOneDecimal(item.totalHours),
      percentage: toPercentageOfTotal(item.totalHours),
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const userBreakdown = Array.from(userBreakdownMap.values())
    .map((item) => ({
      ...item,
      totalHours: roundToOneDecimal(item.totalHours),
      percentage: toPercentageOfTotal(item.totalHours),
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const clientProjectUtilization: ClientProjectUtilizationGroup[] = Array.from(
    clientUtilizationMap.values(),
  )
    .map((group) => {
      const projects = group.projects
        .map((project) => ({
          ...project,
          loggedHours: roundToOneDecimal(project.loggedHours),
          estimatedHours: roundToOneDecimal(project.estimatedHours),
          utilizationPct:
            project.estimatedHours > 0
              ? Math.round(
                  (project.loggedHours / project.estimatedHours) * 100,
                )
              : 0,
        }))
        .sort((a, b) => {
          const estimatedDelta =
            Number(b.estimatedHours > 0) - Number(a.estimatedHours > 0);
          if (estimatedDelta !== 0) return estimatedDelta;
          const utilizationDelta = b.utilizationPct - a.utilizationPct;
          if (utilizationDelta !== 0) return utilizationDelta;
          const loggedDelta = b.loggedHours - a.loggedHours;
          if (loggedDelta !== 0) return loggedDelta;
          return a.projectName.localeCompare(b.projectName);
        });

      return {
        ...group,
        loggedHours: roundToOneDecimal(group.loggedHours),
        estimatedHours: roundToOneDecimal(group.estimatedHours),
        utilizationPct:
          group.estimatedHours > 0
            ? Math.round((group.loggedHours / group.estimatedHours) * 100)
            : 0,
        projects,
      };
    })
    .filter((group) => group.projects.length > 0)
    .sort((a, b) => {
      const estimatedDelta =
        Number(b.estimatedHours > 0) - Number(a.estimatedHours > 0);
      if (estimatedDelta !== 0) return estimatedDelta;
      const utilizationDelta = b.utilizationPct - a.utilizationPct;
      if (utilizationDelta !== 0) return utilizationDelta;
      const loggedDelta = b.loggedHours - a.loggedHours;
      if (loggedDelta !== 0) return loggedDelta;
      return a.clientName.localeCompare(b.clientName);
    });

  const dailyTrends: DailyLoggingTrend[] = getDashboardDateRange(
    startDate,
    endDate,
  ).map((workDate) => ({
    workDate,
    totalHours: roundToOneDecimal(dailyMap.get(workDate) ?? 0),
  }));

  return {
    kpis: {
      totalLoggedHours: roundToOneDecimal(totalLoggedHours),
      activeLoggersCount,
      totalActiveMembers,
      activeLoggerRatePct,
      expectedCapacityHours,
      capacityUtilizationPct,
    },
    clientProjectBreakdown,
    clientProjectUtilization,
    userBreakdown,
    dailyTrends,
  };
};
