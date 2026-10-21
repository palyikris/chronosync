import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipContentProps,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { DailyLoggingTrend } from "../../types/dashboard";
import { parseDashboardDate } from "../../utils/dashboardCalculations";

interface DailyTrendChartProps {
  dailyTrends: DailyLoggingTrend[];
}

interface FormattedDailyTrend extends DailyLoggingTrend {
  formattedDate: string;
  fullDate: string;
  dayOfWeek: string;
  isWeekend: boolean;
}

type CustomTooltipProps = TooltipContentProps & {
  t: TFunction;
  numberFormatter: Intl.NumberFormat;
};

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  t,
  numberFormatter,
}) => {
  const data = payload?.[0]?.payload as FormattedDailyTrend | undefined;
  if (!active || !data) return null;

  return (
    <div className="space-y-1 rounded-xl border border-slate-700 bg-text p-3 text-xs font-medium text-white shadow-xl">
      <p className="font-bold text-primary">
        {data.fullDate} ({data.dayOfWeek})
      </p>
      <p>
        {t("dashboard.loggedLabel")}: {" "}
        <span className="font-bold text-white">
          {t("dashboard.hoursShort", {
            value: numberFormatter.format(data.totalHours),
          })}
        </span>
      </p>
    </div>
  );
};

export const DailyTrendChart: React.FC<DailyTrendChartProps> = ({
  dailyTrends,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const formattedData = useMemo<FormattedDailyTrend[]>(() => {
    const axisDateFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    });
    const fullDateFormatter = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const weekdayFormatter = new Intl.DateTimeFormat(locale, {
      weekday: "short",
    });

    return dailyTrends.flatMap((trend) => {
      const date = parseDashboardDate(trend.workDate);
      if (!date) return [];

      return [
        {
          ...trend,
          formattedDate: axisDateFormatter.format(date),
          fullDate: fullDateFormatter.format(date),
          dayOfWeek: weekdayFormatter.format(date),
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        },
      ];
    });
  }, [dailyTrends, locale]);
  const maxHours = useMemo(
    () => Math.max(...formattedData.map((trend) => trend.totalHours), 0),
    [formattedData],
  );
  const hasLoggedHours = maxHours > 0;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface-strong/84 p-4.5 shadow-card backdrop-blur-xl lg:col-span-2">
      <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-text">
            {t("dashboard.dailyTrendTitle")}
          </h2>
          <p className="text-xs text-muted">
            {t("dashboard.dailyTrendSubtitle")}
          </p>
        </div>

        <div
          className="flex items-center gap-4 text-xs font-semibold"
          aria-label={t("dashboard.dailyTrendLegend")}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded bg-primary"
              aria-hidden="true"
            />
            <span className="text-muted">{t("dashboard.weekday")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded bg-slate-200"
              aria-hidden="true"
            />
            <span className="text-muted">{t("dashboard.weekend")}</span>
          </div>
        </div>
      </div>

      {!hasLoggedHours ? (
        <div className="py-20 text-center text-sm text-muted">
          {t("dashboard.noEntriesInRange")}
        </div>
      ) : (
        <div
          className="h-64 w-full pt-2"
          aria-label={t("dashboard.dailyTrendAccessibleLabel")}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              data={formattedData}
              margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                axisLine={{ stroke: "var(--color-border-strong)" }}
                tickLine={false}
                minTickGap={24}
                interval="preserveStartEnd"
              />
              <YAxis
                width={42}
                tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => numberFormatter.format(value)}
              />
              <Tooltip
                content={(tooltipProps) => (
                  <CustomTooltip
                    {...tooltipProps}
                    t={t}
                    numberFormatter={numberFormatter}
                  />
                )}
                cursor={{ fill: "rgba(91,104,66,0.05)" }}
              />

              <Bar dataKey="totalHours" radius={[4, 4, 0, 0]}>
                {formattedData.map((entry) => {
                  let fillColor = "var(--color-primary)";
                  if (entry.isWeekend) {
                    fillColor = "var(--color-slate-200)";
                  } else if (
                    entry.totalHours === maxHours &&
                    entry.totalHours > 0
                  ) {
                    fillColor = "var(--color-primary-strong)";
                  }

                  return (
                    <Cell key={entry.workDate} fill={fillColor} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
