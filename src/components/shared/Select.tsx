import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import type { SelectProps } from "../../types/ui";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const extractOptions = (children: React.ReactNode): SelectOption[] => {
  const options: SelectOption[] = [];

  const walk = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const childProps = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: React.ReactNode;
      };

      if (child.type === "option") {
        const { value, disabled, children: optionChildren } = childProps;
        const label = React.Children.toArray(optionChildren)
          .map((part) => {
            if (typeof part === "string" || typeof part === "number") {
              return String(part);
            }
            return "";
          })
          .join("")
          .trim();

        options.push({
          value: String(value ?? ""),
          label: label || String(value ?? ""),
          disabled: Boolean(disabled),
        });
        return;
      }

      if (child.type === "optgroup" && childProps.children) {
        walk(childProps.children);
        return;
      }

      if (childProps.children) {
        walk(childProps.children);
      }
    });
  };

  walk(children);
  return options;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      leftIcon,
      label,
      id,
      value,
      onChange,
      disabled,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const hasValue = value !== undefined && value !== null && value !== "";
    const options = useMemo(() => extractOptions(children), [children]);
    const selectedOption = useMemo(
      () => options.find((option) => option.value === String(value ?? "")),
      [options, value],
    );

    const filteredOptions = useMemo(() => {
      const term = searchQuery.trim().toLowerCase();

      if (!term) {
        return options;
      }

      return options.filter((option) => {
        const optionText = `${option.label} ${option.value}`.toLowerCase();
        return optionText.includes(term);
      });
    }, [options, searchQuery]);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const handleClickOutside = (event: MouseEvent) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      searchInputRef.current?.focus();
      setSearchQuery("");

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    const handleSelect = (nextValue: string) => {
      setIsOpen(false);

      if (!onChange) {
        return;
      }

      const event = {
        target: {
          value: nextValue,
          name: props.name ?? id ?? "",
          id: id ?? "",
        },
        currentTarget: {
          value: nextValue,
          name: props.name ?? id ?? "",
          id: id ?? "",
        },
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
        bubbles: true,
        cancelable: true,
      } as React.ChangeEvent<HTMLSelectElement>;

      onChange(event);
    };

    const selectedLabel = selectedOption?.label ?? "";
    const displayLabel = hasValue
      ? selectedLabel
      : (placeholder ?? label ?? " ");
    const shouldShowSearch = options.length > 5;

    return (
      <div
        ref={wrapperRef}
        className={cn("auth-field", hasValue && "has-value", className)}
      >
        {leftIcon ? (
          <span
            className="material-symbols-outlined auth-field-icon"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        ) : null}

        <button
          type="button"
          id={id}
          className="auth-input relative flex cursor-pointer items-center text-left"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-options` : undefined}
          onClick={() => !disabled && setIsOpen((open) => !open)}
        >
          <span
            className={cn(
              "block truncate pr-6 text-sm sm:text-base",
              !hasValue && "text-muted",
            )}
          >
            {displayLabel}
          </span>
          <span className="absolute inset-y-0 right-3 flex items-center text-muted">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </span>
        </button>

        {label ? <label htmlFor={id}>{label}</label> : null}

        {isOpen ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-[#dfe3e4] bg-white shadow-lg">
            {shouldShowSearch ? (
              <div className="border-b border-[#edf0f0] px-3 py-3">
                <div className="auth-field">
                  <Search
                    className="auth-field-icon h-4 w-4"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="auth-input placeholder:text-muted"
                    placeholder={t("common.searchOptions")}
                    aria-label={t("common.searchOptions")}
                  />
                </div>
              </div>
            ) : null}

            <div
              id={id ? `${id}-options` : undefined}
              role="listbox"
              className="max-h-60 overflow-y-auto py-1"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = option.value === String(value ?? "");

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-150",
                        isSelected
                          ? "bg-[#eef7bf] text-primary-foreground"
                          : "text-text hover:bg-[#f3f6f4]",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                      onClick={() => {
                        if (!option.disabled) {
                          handleSelect(option.value);
                        }
                      }}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0 text-primary-strong" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-muted">
                  No options found
                </div>
              )}
            </div>
          </div>
        ) : null}

        <select
          ref={ref}
          aria-hidden="true"
          tabIndex={-1}
          value={value}
          name={props.name}
          required={props.required}
          disabled={disabled}
          className="sr-only absolute inset-0 opacity-0"
          onChange={(event) => {
            onChange?.(event);
          }}
        >
          {children}
        </select>
      </div>
    );
  },
);

Select.displayName = "Select";
