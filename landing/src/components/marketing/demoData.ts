export const demoProject = {
  client: "Acme Studio",
  project: "Brand exploration",
  person: "Jamie Davis",
  period: "October 2026",
  rate: 75,
  newHours: 2,
  reference: "CHR-DEMO-001",
  entries: [
    { date: "2026-10-19", task: "Brand research", hours: 8 },
    { date: "2026-10-20", task: "Creative direction", hours: 8 },
    { date: "2026-10-21", task: "Concept development", hours: 6 },
    { date: "2026-10-22", task: "Brand exploration", hours: 2 },
  ],
} as const;

export function getDemoCsv() {
  const header = "Data type,Date,Client,Project,Team member,Task,Approved hours,Hourly rate EUR,Net amount EUR";
  const rows = demoProject.entries.map((entry) => ["Illustrative fictional sample", entry.date, demoProject.client, demoProject.project, demoProject.person, entry.task, entry.hours, demoProject.rate, entry.hours * demoProject.rate].join(","));
  return [header, ...rows, ["TOTAL", "", "", "", "", "", 24, "", 1800].join(",")].join("\r\n");
}
