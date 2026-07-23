import React from "react";
import { Calendar } from "lucide-react";

interface DashboardHeaderProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#191c1d]">Company Dashboard</h1>
        <p className="text-sm text-[#5e5e62] mt-1">
          Real-time insights into hours logged, client distribution, and team
          compliance.
        </p>
      </div>

      <div className="flex items-center gap-2 bg-white p-1.5 border border-[#C4C7C5] rounded-2xl shadow-sm text-sm">
        <Calendar className="w-4 h-4 text-[#5e5e62] ml-2" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="border-none bg-transparent outline-none text-[#191c1d] font-semibold text-xs cursor-pointer"
        />
        <span className="text-[#C4C7C5]">—</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="border-none bg-transparent outline-none text-[#191c1d] font-semibold text-xs cursor-pointer pr-2"
        />
      </div>
    </header>
  );
};
