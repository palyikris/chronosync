import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReviewTablePaginationProps {
  currentPage: number;
  totalPages: number;
  startClientIndex: number;
  totalClients: number;
  totalEntries: number;
  clientsPerPage: number;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  t: any;
}

export const ReviewTablePagination: React.FC<ReviewTablePaginationProps> = ({
  currentPage,
  totalPages,
  startClientIndex,
  totalClients,
  totalEntries,
  clientsPerPage,
  onPageChange,
  onPrevPage,
  onNextPage,
  t,
}) => {
  if (totalClients === 0) {
    return null;
  }

  const endClientIndex = Math.min(
    startClientIndex + clientsPerPage,
    totalClients,
  );

  return (
    <div className="p-4 border-t border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
      <div>
        {t("timesheetReview.showingClients", {
          start: startClientIndex + 1,
          end: endClientIndex,
          total: totalClients,
          entries: totalEntries,
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={currentPage === 1}
          className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1 font-medium">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
                  currentPage === page
                    ? "bg-primary text-white font-bold"
                    : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
