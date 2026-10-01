export const formatHours = (hours: number): string =>
  Number.isInteger(hours)
    ? `${hours}`
    : Number(hours.toFixed(2)).toString();