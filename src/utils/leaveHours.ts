const pad = (value: number) => String(value).padStart(2, "0");

const isWeekend = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const getLeaveWorkingDayCount = (startDate: string, endDate: string) => {
  let count = 0;
  const cursor = new Date(`${startDate}T00:00:00`);
  const lastDate = new Date(`${endDate}T00:00:00`);

  while (cursor <= lastDate) {
    const dateString = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    if (!isWeekend(dateString)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
};

export const getLeaveDateRange = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const lastDate = new Date(`${endDate}T00:00:00`);

  while (cursor <= lastDate) {
    const dateString = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    dates.push(dateString);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

export const getEffectiveWeeklyHours = (
  weeklyHours: number | null | undefined,
  fallbackHours: number | null | undefined = 40,
) => Number(weeklyHours ?? fallbackHours ?? 40);

export const calculateLeaveHoursForDateRange = (
  weeklyHours: number | null | undefined,
  startDate: string,
  endDate: string,
) => {
  const workDayCount = getLeaveWorkingDayCount(startDate, endDate);
  const effectiveWeeklyHours = getEffectiveWeeklyHours(weeklyHours, 40);

  return Number(((effectiveWeeklyHours / 5) * workDayCount).toFixed(2));
};
