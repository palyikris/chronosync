import React from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  buttonClassName?: string;
  align?: "start" | "end";
  placement?: "top" | "bottom";
  showIcon?: boolean;
}

const pad = (value: number) => String(value).padStart(2, "0");

const toDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateValue = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const addDays = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  ariaLabel,
  id,
  name,
  min,
  max,
  required = false,
  disabled = false,
  invalid = false,
  className,
  buttonClassName,
  align = "start",
  placement = "bottom",
  showIcon = true,
}) => {
  const { t, i18n } = useTranslation();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const calendarId = React.useId();
  const generatedInputId = React.useId();
  const inputId = id ?? generatedInputId;
  const selectedDate = parseDateValue(value);
  const today = React.useMemo(() => new Date(), []);
  const todayValue = toDateValue(today);
  const [isOpen, setIsOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() =>
    startOfMonth(selectedDate ?? today),
  );
  const [focusedDate, setFocusedDate] = React.useState(
    value || todayValue,
  );
  const language = i18n.resolvedLanguage || i18n.language || "en";

  const monthNames = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        new Intl.DateTimeFormat(language, { month: "long" }).format(
          new Date(2024, month, 1),
        ),
      ),
    [language],
  );

  const weekDays = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(language, { weekday: "narrow" }).format(
          new Date(Date.UTC(2024, 0, 1 + index)),
        ),
      ),
    [language],
  );

  const formattedValue = selectedDate
    ? new Intl.DateTimeFormat(language, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : t("common.selectDate");

  const minimumYear = min
    ? (parseDateValue(min)?.getFullYear() ?? today.getFullYear() - 50)
    : today.getFullYear() - 50;
  const maximumYear = max
    ? (parseDateValue(max)?.getFullYear() ?? today.getFullYear() + 50)
    : today.getFullYear() + 50;
  const firstYear = Math.min(minimumYear, visibleMonth.getFullYear());
  const lastYear = Math.max(maximumYear, visibleMonth.getFullYear());
  const years = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => firstYear + index,
  );

  const firstOfVisibleMonth = startOfMonth(visibleMonth);
  const mondayFirstOffset = (firstOfVisibleMonth.getDay() + 6) % 7;
  const daysInVisibleMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarCellCount =
    Math.ceil((mondayFirstOffset + daysInVisibleMonth) / 7) * 7;
  const firstCalendarDate = addDays(firstOfVisibleMonth, -mondayFirstOffset);
  const calendarDays = Array.from({ length: calendarCellCount }, (_, index) =>
    addDays(firstCalendarDate, index),
  );

  const isWithinRange = React.useCallback(
    (dateValue: string) =>
      (!min || dateValue >= min) && (!max || dateValue <= max),
    [max, min],
  );

  const canMoveToMonth = (month: Date) => {
    const monthStart = toDateValue(startOfMonth(month));
    const monthEnd = toDateValue(
      new Date(month.getFullYear(), month.getMonth() + 1, 0),
    );
    return (!min || monthEnd >= min) && (!max || monthStart <= max);
  };

  const openCalendar = () => {
    const initialDate = selectedDate ?? today;
    setVisibleMonth(startOfMonth(initialDate));
    setFocusedDate(toDateValue(initialDate));
    setIsOpen(true);
  };

  const closeCalendar = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => document.removeEventListener("mousedown", closeOnOutsidePointer);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const focusFrame = window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)
        ?.focus();
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [focusedDate, isOpen, visibleMonth]);

  const selectDate = (date: Date) => {
    const dateValue = toDateValue(date);
    if (!isWithinRange(dateValue)) return;

    onChange(dateValue);
    setFocusedDate(dateValue);
    setVisibleMonth(startOfMonth(date));
    closeCalendar(true);
  };

  const moveFocus = (date: Date) => {
    const dateValue = toDateValue(date);
    if (!isWithinRange(dateValue)) return;

    setFocusedDate(dateValue);
    setVisibleMonth(startOfMonth(date));
  };

  const handleDayKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: Date,
  ) => {
    let nextDate: Date | null = null;

    if (event.key === "ArrowLeft") nextDate = addDays(date, -1);
    if (event.key === "ArrowRight") nextDate = addDays(date, 1);
    if (event.key === "ArrowUp") nextDate = addDays(date, -7);
    if (event.key === "ArrowDown") nextDate = addDays(date, 7);
    if (event.key === "Home") nextDate = addDays(date, -((date.getDay() + 6) % 7));
    if (event.key === "End") nextDate = addDays(date, 6 - ((date.getDay() + 6) % 7));
    if (event.key === "PageUp") nextDate = addMonths(date, -1);
    if (event.key === "PageDown") nextDate = addMonths(date, 1);

    if (nextDate) {
      event.preventDefault();
      moveFocus(nextDate);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeCalendar(true);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1 block text-xs font-semibold text-muted"
        >
          {label}
        </label>
      ) : null}

      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel}: ${formattedValue}` : undefined}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? calendarId : undefined}
        aria-required={required}
        aria-invalid={invalid}
        onClick={() => (isOpen ? closeCalendar() : openCalendar())}
        className={cn(
          "auth-input group flex h-11 min-h-11 items-center gap-2.5 py-0 text-left transition-all duration-300 ease-out hover:border-primary-strong/45 hover:bg-bg-accent",
          invalid && "border-danger-border",
          buttonClassName,
        )}
      >
        {showIcon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/35 text-primary-strong transition-colors group-hover:bg-primary/55">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px] font-medium",
            selectedDate ? "text-text" : "text-muted",
          )}
        >
          {formattedValue}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            isOpen && "rotate-180 text-primary-strong",
          )}
          aria-hidden="true"
        />
      </button>

      {name ? <input type="hidden" name={name} value={value} /> : null}

      {isOpen ? (
        <div
          id={calendarId}
          role="dialog"
          aria-modal="false"
          aria-label={t("common.calendar")}
          className={cn(
            "absolute z-[80] w-[20.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.25rem] border border-primary-strong/20 bg-surface-strong shadow-[0_20px_55px_rgba(75,87,57,0.18),0_3px_10px_rgba(75,87,57,0.08)] backdrop-blur-2xl animate-[popover-in_300ms_cubic-bezier(0.22,0.7,0.24,1)]",
            align === "end" ? "right-0" : "left-0",
            placement === "top"
              ? "bottom-[calc(100%+0.55rem)] origin-bottom"
              : "top-[calc(100%+0.55rem)] origin-top",
          )}
        >
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_right,rgba(207,231,143,0.34),transparent_12rem)] p-3.5 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("common.previousMonth")}
                disabled={!canMoveToMonth(addMonths(visibleMonth, -1))}
                onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-white/55 text-muted-strong transition-colors duration-300 ease-out hover:border-primary-strong/25 hover:bg-primary/25 hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_5.25rem] gap-1.5">
                <label className="sr-only" htmlFor={`${calendarId}-month`}>
                  {t("common.month")}
                </label>
                <select
                  id={`${calendarId}-month`}
                  value={visibleMonth.getMonth()}
                  onChange={(event) =>
                    setVisibleMonth(
                      new Date(
                        visibleMonth.getFullYear(),
                        Number(event.target.value),
                        1,
                      ),
                    )
                  }
                  className="min-w-0 rounded-xl border border-border-strong bg-bg-accent/80 px-2.5 py-1.5 text-[13px] font-semibold capitalize text-text outline-none transition duration-300 ease-out focus:border-primary-strong/60 focus:ring-2 focus:ring-primary/55"
                >
                  {monthNames.map((monthName, month) => (
                    <option key={monthName} value={month}>
                      {monthName}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor={`${calendarId}-year`}>
                  {t("common.year")}
                </label>
                <select
                  id={`${calendarId}-year`}
                  value={visibleMonth.getFullYear()}
                  onChange={(event) =>
                    setVisibleMonth(
                      new Date(
                        Number(event.target.value),
                        visibleMonth.getMonth(),
                        1,
                      ),
                    )
                  }
                  className="rounded-xl border border-border-strong bg-bg-accent/80 px-2 py-1.5 text-[13px] font-semibold text-text outline-none transition duration-300 ease-out focus:border-primary-strong/60 focus:ring-2 focus:ring-primary/55"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                aria-label={t("common.nextMonth")}
                disabled={!canMoveToMonth(addMonths(visibleMonth, 1))}
                onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-white/55 text-muted-strong transition-colors duration-300 ease-out hover:border-primary-strong/25 hover:bg-primary/25 hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            key={`${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}`}
            className="calendar-month p-3.5 pt-2.5"
          >
            <div className="mb-1 grid grid-cols-7" aria-hidden="true">
              {weekDays.map((day, index) => (
                <div
                  key={`${day}-${index}`}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
                >
                  {day}
                </div>
              ))}
            </div>

            <div role="grid" className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((date) => {
                const dateValue = toDateValue(date);
                const isSelected = dateValue === value;
                const isToday = dateValue === todayValue;
                const isCurrentMonth =
                  date.getMonth() === visibleMonth.getMonth() &&
                  date.getFullYear() === visibleMonth.getFullYear();
                const isDisabled = !isWithinRange(dateValue);

                return (
                  <button
                    key={dateValue}
                    type="button"
                    role="gridcell"
                    data-date={dateValue}
                    tabIndex={focusedDate === dateValue ? 0 : -1}
                    disabled={isDisabled}
                    aria-label={new Intl.DateTimeFormat(language, {
                      dateStyle: "full",
                    }).format(date)}
                    aria-selected={isSelected}
                    onClick={() => selectDate(date)}
                    onKeyDown={(event) => handleDayKeyDown(event, date)}
                    className={cn(
                      "relative flex aspect-square min-h-9 items-center justify-center rounded-xl text-[12px] font-medium transition-[background-color,color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong/45 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-25",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(96,120,42,0.22)]"
                        : isToday
                          ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-primary/25"
                          : isCurrentMonth
                            ? "text-text hover:bg-primary/25"
                            : "text-slate-400 hover:bg-bg-accent hover:text-muted-strong",
                    )}
                  >
                    {date.getDate()}
                    {isToday && !isSelected ? (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-primary/8 px-3.5 py-2.5">
            <button
              type="button"
              disabled={!isWithinRange(todayValue)}
              onClick={() => selectDate(today)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-primary-strong transition-colors duration-300 ease-out hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {t("common.today")}
            </button>
            <button
              type="button"
              disabled={!value || required}
              onClick={() => {
                onChange("");
                closeCalendar(true);
              }}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted-strong transition-colors duration-300 ease-out hover:bg-white/70 hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
            >
              {t("common.clear")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
