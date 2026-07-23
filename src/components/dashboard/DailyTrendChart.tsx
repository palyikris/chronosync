import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DailyLoggingTrend } from "../../types/dashboard";

interface DailyTrendChartProps {
  dailyTrends: DailyLoggingTrend[];
}

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
}> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#191c1d] text-white p-3 rounded-xl shadow-xl border border-gray-800 text-xs font-medium space-y-1">
        <p className="text-[#abdb11] font-bold">
          {data.formattedDate} ({data.dayOfWeek})
        </p>
        <p>
          Logged:{" "}
          <span className="font-bold text-white">{data.totalHours} hrs</span>
        </p>
      </div>
    );
  }
  return null;
};

export const DailyTrendChart: React.FC<DailyTrendChartProps> = ({
  dailyTrends,
}) => {
  // Format dates and identify weekends
  const formattedData = useMemo(() => {
    return dailyTrends.map((trend) => {
      const dateObj = new Date(trend.workDate);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      return {
        ...trend,
        formattedDate: dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        dayOfWeek: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
        isWeekend,
      };
    });
  }, [dailyTrends]);

  // Find peak day to highlight top volume
  const maxHours = useMemo(() => {
    return Math.max(...dailyTrends.map((t) => t.totalHours), 0);
  }, [dailyTrends]);

  

  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#C4C7C5] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#191c1d]">
            Daily Logging Trend
          </h2>
          <p className="text-xs text-[#5e5e62]">
            Total hours logged per calendar day across all active team members
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-primary" />
            <span className="text-[#5e5e62]">Weekday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#e3e2e6]" />
            <span className="text-[#5e5e62]">Weekend</span>
          </div>
        </div>
      </div>

      {formattedData.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">
          No time entries recorded for this date range.
        </div>
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 10, fill: "#5e5e62" }}
                axisLine={{ stroke: "#C4C7C5" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#5e5e62" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
              />

              <Bar dataKey="totalHours" radius={[4, 4, 0, 0]}>
                {formattedData.map((entry, index) => {
                  let fillColor = "#abdb11"; // Brand lime for normal weekdays
                  if (entry.isWeekend) {
                    fillColor = "#e3e2e6"; // Soft gray for weekends
                  } else if (entry.totalHours === maxHours && maxHours > 0) {
                    fillColor = "#4e6700"; // Dark olive to highlight peak logging day
                  }

                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
