import React, { type ReactNode } from "react";
import { Clock, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumbers";

export interface KpiSummaryCardItem {
  title: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  valueSuffix?: string;
  valuePrefix?: string;
  className?: string;
  footer?: ReactNode;
}

export interface KpiSummaryCardsProps {
  items: KpiSummaryCardItem[];
}

interface KpiCardProps extends KpiSummaryCardItem {
  icon: LucideIcon;
}

const getNumericValue = (value: ReactNode): number | null => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
};

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName = "text-primary-strong",
  valueSuffix,
  valuePrefix,
  className = "",
  footer,
}) => {
  const numericValue = getNumericValue(value);

  return (
    <div
      className={`group flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-surface-strong/84 p-4.5 shadow-card backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-border-strong hover:shadow-card-hover ${className}`.trim()}
    >
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-medium text-muted">
          {title}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-primary-strong/8 bg-primary/12 text-primary-strong">
          <Icon className={`h-4 w-4 ${iconClassName}`} />
        </div>
      </div>
      <div className="mt-4">
        {numericValue !== null ? (
          <AnimatedNumber
            className="text-[28px] font-semibold tracking-[-0.04em] text-text"
            value={numericValue}
            prefix={valuePrefix}
            suffix={valueSuffix}
            decimals={Number.isInteger(numericValue) ? 0 : 2}
          ></AnimatedNumber>
        ) : (
          <span className="text-[28px] font-semibold tracking-[-0.04em] text-text tabular-nums">
            {valuePrefix}
            {value}
            {valueSuffix}
          </span>
        )}
        {subtitle ? (
          <p className="text-xs text-muted mt-2 font-medium">{subtitle}</p>
        ) : null}
        {footer ? <div className="mt-2">{footer}</div> : null}
      </div>
    </div>
  );
};

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({ items }) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <KpiCard
          key={`${item.title}-${index}`}
          title={item.title}
          value={item.value}
          subtitle={item.subtitle}
          icon={item.icon ?? Clock}
          iconClassName={item.iconClassName}
          valueSuffix={item.valueSuffix}
          valuePrefix={item.valuePrefix}
          className={item.className}
          footer={item.footer}
        />
      ))}
    </div>
  );
};
