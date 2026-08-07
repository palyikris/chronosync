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
  iconClassName = "text-[#4e6700]",
  valueSuffix,
  valuePrefix,
  className = "",
  footer,
}) => {
  const numericValue = getNumericValue(value);

  return (
    <div
      className={`bg-white p-6 rounded-2xl border border-border-strong shadow-sm flex flex-col justify-between ${className}`.trim()}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-foreground">
          <Icon className={`w-5 h-5 ${iconClassName}`} />
        </div>
      </div>
      <div className="mt-4">
        {numericValue !== null ? (
          <AnimatedNumber
            className="text-3xl font-extrabold text-text"
            value={numericValue}
            prefix={valuePrefix}
            suffix={valueSuffix}
            decimals={Number.isInteger(numericValue) ? 0 : 2}
          ></AnimatedNumber>
        ) : (
          <span className="text-3xl font-extrabold text-text tabular-nums">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
