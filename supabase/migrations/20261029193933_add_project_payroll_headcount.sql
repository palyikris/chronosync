-- NULL means an ordinary project; a positive headcount marks payroll work.
alter table public.projects add column payroll_headcount integer;
alter table public.projects add constraint projects_payroll_headcount_positive
  check (payroll_headcount is null or payroll_headcount > 0);
comment on column public.projects.payroll_headcount is
  'Payroll headcount. NULL disables payroll billing; otherwise hourly invoice quantities and attachment hours are multiplied by this positive integer. Logged time remains unchanged.';
