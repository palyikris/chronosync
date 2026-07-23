import React from "react";
import type { ClientProjectBreakdown } from "../../types/dashboard";

interface ProjectBreakdownPanelProps {
  breakdown: ClientProjectBreakdown[];
}

export const ProjectBreakdownPanel: React.FC<ProjectBreakdownPanelProps> = ({
  breakdown,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#C4C7C5] shadow-sm space-y-6">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-[#191c1d]">Client & Project Share</h2>
        <p className="text-xs text-[#5e5e62]">Resource allocation by project</p>
      </div>

      {breakdown.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No project breakdown data available.
        </div>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
          {breakdown.map((item) => (
            <div key={`${item.clientId}-${item.projectId}`} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#191c1d]">
                  {item.clientName}{" "}
                  <span className="font-normal text-[#5e5e62]">/ {item.projectName}</span>
                </span>
                <span className="text-[#4e6700] font-bold">{item.totalHours} hrs</span>
              </div>
              <div className="w-full bg-[#f3f4f5] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#4e6700] h-full rounded-full transition-all duration-300"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="text-[10px] text-[#5e5e62] text-right font-medium">
                {item.percentage}% of total time
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
