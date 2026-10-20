// src/components/dashboard/BreakdownPanel.tsx
import React from "react";
import type { BreakdownItem } from "../../types/dashboard";

interface BreakdownPanelProps {
  title: string;
  subtitle: string;
  emptyMessage: string;
  items: BreakdownItem[];
}

export const BreakdownPanel: React.FC<BreakdownPanelProps> = ({
  title,
  subtitle,
  emptyMessage,
  items,
}) => {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface-strong/84 p-4.5 shadow-card backdrop-blur-xl">
      <div className="border-b border-border pb-4">
        <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-text">{title}</h2>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="max-h-80 space-y-4 overflow-y-auto pr-2">
          {items.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-text">
                  {item.primaryLabel}{" "}
                  {item.secondaryLabel && (
                    <span className="font-normal text-muted">
                      / {item.secondaryLabel}
                    </span>
                  )}
                </span>
                <span className="font-bold text-primary-strong">
                  {item.totalHours} hrs
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-primary-strong transition-all duration-500"
                  style={{
                    width: `${Math.min(Math.max(item.percentage, 0), 100)}%`,
                  }}
                />
              </div>
              <div className="text-right text-[10px] font-medium text-muted">
                {item.percentage}% of total time
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
