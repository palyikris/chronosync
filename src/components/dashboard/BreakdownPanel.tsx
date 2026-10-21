// src/components/dashboard/BreakdownPanel.tsx
import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
  const numberFormatter = new Intl.NumberFormat(
    i18n.resolvedLanguage || i18n.language,
    { maximumFractionDigits: 1 },
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface-strong/84 p-4.5 shadow-card backdrop-blur-xl">
      <div className="border-b border-border pb-4">
        <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-text">
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">
          {emptyMessage}
        </div>
      ) : (
        <ul className="max-h-80 space-y-4 overflow-y-auto pr-2">
          {items.map((item) => (
            <li key={item.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3 text-xs font-semibold">
                <span className="min-w-0 leading-5 text-text">
                  {item.primaryLabel}{" "}
                  {item.secondaryLabel && (
                    <span className="break-words font-normal text-muted">
                      / {item.secondaryLabel}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-primary-strong">
                  {t("dashboard.hoursShort", {
                    value: numberFormatter.format(item.totalHours),
                  })}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={t("dashboard.breakdownProgressLabel", {
                  label: item.secondaryLabel
                    ? `${item.primaryLabel} / ${item.secondaryLabel}`
                    : item.primaryLabel,
                })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(Math.max(item.percentage, 0), 100)}
                aria-valuetext={`${numberFormatter.format(item.percentage)}%`}
                className="h-2 w-full overflow-hidden rounded-full bg-bg"
              >
                <div
                  className="h-full rounded-full bg-primary-strong transition-[width] duration-500 motion-reduce:transition-none"
                  style={{
                    width: `${Math.min(Math.max(item.percentage, 0), 100)}%`,
                  }}
                />
              </div>
              <div className="text-right text-[10px] font-medium text-muted">
                {t("dashboard.shareOfTotal", {
                  percentage: numberFormatter.format(item.percentage),
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
