import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Lock, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import type { SelectProps } from "../../types/ui";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type StyledSelectProps = SelectProps & {
  menuPlacement?: "top" | "bottom";
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

export const Select = React.forwardRef<HTMLSelectElement, StyledSelectProps>(
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
      disabledReason,
      placeholder,
      menuPlacement = "bottom",
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isDisabledHintOpen, setIsDisabledHintOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [menuStyles, setMenuStyles] = useState<React.CSSProperties | null>(
      null,
    );
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const lockButtonRef = useRef<HTMLButtonElement | null>(null);
    const disabledTooltipRef = useRef<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [disabledHintStyles, setDisabledHintStyles] =
      useState<React.CSSProperties | null>(null);
    const generatedId = useId();
    const controlId = id ?? `select-${generatedId.replace(/:/g, "")}`;
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

    const getMenuPosition = (): React.CSSProperties | null => {
      const trigger = triggerRef.current;

      if (!trigger) {
        return null;
      }

      const spacing = 6;
      const viewportPadding = 12;
      const maxPanelHeight = 240;
      const rect = trigger.getBoundingClientRect();
      const spaceAbove = rect.top - viewportPadding;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const prefersTop = menuPlacement === "top";
      const canOpenTop = spaceAbove >= maxPanelHeight;
      const canOpenBottom = spaceBelow >= maxPanelHeight;

      const placeTop = prefersTop
        ? canOpenTop || (!canOpenBottom && spaceAbove > spaceBelow)
        : !canOpenBottom && spaceAbove > spaceBelow;

      const availableHeight = placeTop ? spaceAbove : spaceBelow;
      const panelMaxHeight = Math.max(
        120,
        Math.min(maxPanelHeight, availableHeight),
      );

      return {
        position: "fixed",
        left: rect.left,
        top: placeTop ? rect.top - spacing : rect.bottom + spacing,
        width: rect.width,
        maxHeight: panelMaxHeight,
        zIndex: 1000,
        transformOrigin: placeTop ? "bottom" : "top",
        transform: placeTop ? "translateY(-100%)" : undefined,
      };
    };

    const getDisabledHintPosition = (): React.CSSProperties | null => {
      const lockButton = lockButtonRef.current;

      if (!lockButton) {
        return null;
      }

      const viewportPadding = 12;
      const tooltipWidth = disabledTooltipRef.current?.offsetWidth ?? 160;
      const rect = lockButton.getBoundingClientRect();
      const halfWidth = tooltipWidth / 2;
      const centerX = rect.left + rect.width / 2;
      const clampedCenterX = Math.max(
        viewportPadding + halfWidth,
        Math.min(centerX, window.innerWidth - viewportPadding - halfWidth),
      );

      return {
        position: "fixed",
        top: rect.top - 8,
        left: clampedCenterX,
        width: "max-content",
        maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
        zIndex: 1100,
      };
    };

    useLayoutEffect(() => {
      if (!isOpen) {
        setMenuStyles(null);
        return;
      }

      const updateMenuPosition = () => {
        const nextPosition = getMenuPosition();

        if (!nextPosition) {
          return;
        }

        setMenuStyles(nextPosition);
      };

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;

        if (
          wrapperRef.current?.contains(target) ||
          dropdownRef.current?.contains(target)
        ) {
          return;
        }

        setIsOpen(false);
      };

      updateMenuPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updateMenuPosition);
      window.addEventListener("scroll", updateMenuPosition, true);
      searchInputRef.current?.focus();
      setSearchQuery("");

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", updateMenuPosition);
        window.removeEventListener("scroll", updateMenuPosition, true);
      };
    }, [isOpen, menuPlacement]);

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
    const defaultPlaceholder = placeholder ?? label ?? " ";
    const accessibleLabel = props["aria-label"] ?? label ?? placeholder;
    const displayLabel = hasValue ? selectedLabel : defaultPlaceholder;
    const shouldShowSearch = options.length > 5;
    const resolvedDisabledReason =
      disabledReason ?? t("common.disabled", "Disabled");

    useEffect(() => {
      if (!disabled) {
        setIsDisabledHintOpen(false);
        setDisabledHintStyles(null);
      }
    }, [disabled]);

    useEffect(() => {
      if (!isDisabledHintOpen) {
        return;
      }

      const updateHintPosition = () => {
        setDisabledHintStyles(getDisabledHintPosition());
      };

      updateHintPosition();
      const animationFrameId = window.requestAnimationFrame(updateHintPosition);

      const handleOutsideClick = (event: MouseEvent) => {
        const target = event.target as Node;

        if (
          !wrapperRef.current?.contains(target) &&
          !disabledTooltipRef.current?.contains(target)
        ) {
          setIsDisabledHintOpen(false);
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsDisabledHintOpen(false);
        }
      };

      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
      window.addEventListener("resize", updateHintPosition);
      window.addEventListener("scroll", updateHintPosition, true);

      return () => {
        window.cancelAnimationFrame(animationFrameId);
        document.removeEventListener("mousedown", handleOutsideClick);
        document.removeEventListener("keydown", handleEscape);
        window.removeEventListener("resize", updateHintPosition);
        window.removeEventListener("scroll", updateHintPosition, true);
      };
    }, [isDisabledHintOpen]);

    return (
      <div
        ref={wrapperRef}
        className={cn(
          "auth-field auth-select-field",
          hasValue && "has-value",
          className,
        )}
      >
        {leftIcon ? (
          <span className="auth-field-icon" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        <button
          ref={triggerRef}
          type="button"
          id={controlId}
          className={cn(
            "auth-input relative flex items-center text-left",
            disabled
              ? "cursor-not-allowed border-border bg-bg-accent/65 text-muted"
              : "cursor-pointer",
          )}
          disabled={disabled}
          aria-label={accessibleLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${controlId}-options` : undefined}
          onClick={() => {
            if (disabled) {
              return;
            }

            setIsOpen((open) => {
              if (!open) {
                setMenuStyles(getMenuPosition());
              }

              return !open;
            });
          }}
        >
          <span
            className={cn(
              "block truncate pr-6 text-[13px]",
              !hasValue && "text-muted",
            )}
          >
            {displayLabel}
          </span>
          <span className="absolute inset-y-0 right-3 flex items-center text-muted">
            {disabled ? null : (
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            )}
          </span>
        </button>

        {disabled ? (
          <>
            <button
              ref={lockButtonRef}
              type="button"
              className="absolute right-2.5 top-1/2 z-10 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-bg-accent/70 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              aria-label={resolvedDisabledReason}
              aria-expanded={isDisabledHintOpen}
              aria-controls={
                isDisabledHintOpen ? `${controlId}-disabled-tooltip` : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDisabledHintOpen((open) => !open);
              }}
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {disabledHintStyles
              ? createPortal(
                  <div
                    id={`${controlId}-disabled-tooltip`}
                    role="tooltip"
                    style={{
                      ...disabledHintStyles,
                      transform: "translate(-50%, -100%)",
                    }}
                    aria-hidden={!isDisabledHintOpen}
                    className="pointer-events-none"
                  >
                    <div
                      ref={disabledTooltipRef}
                      className={cn(
                        "relative origin-bottom rounded-md border border-border bg-surface-strong px-2.5 py-1.5 text-[11px] leading-tight text-muted shadow-lg transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isDisabledHintOpen
                          ? "translate-y-0 scale-100 opacity-100 blur-0"
                          : "translate-y-1.5 scale-95 opacity-0 blur-[1px]",
                      )}
                    >
                      {resolvedDisabledReason}
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-xs border-b border-r border-border bg-surface-strong"
                      />
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </>
        ) : null}

        {isOpen
          ? createPortal(
              <div
                ref={dropdownRef}
                style={menuStyles}
                className={cn(
                  "overflow-hidden rounded-xl border border-border-strong bg-surface-strong/95 shadow-[0_12px_32px_rgba(75,87,57,0.14)] backdrop-blur-2xl animate-[popover-in_160ms_cubic-bezier(0.22,1,0.36,1)]",
                  !menuStyles && "invisible",
                )}
                aria-hidden={!menuStyles}
              >
                {shouldShowSearch ? (
                  <div className="border-b border-border bg-bg-accent/60 px-3 py-3">
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
                  id={`${controlId}-options`}
                  role="listbox"
                  className="max-h-60 overflow-y-auto py-1"
                  style={{ maxHeight: "min(240px, calc(100vh - 24px))" }}
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
                            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors duration-150",
                            isSelected
                              ? "bg-black/6 text-text"
                              : "text-text hover:bg-black/[0.035]",
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
              </div>,
              document.body,
            )
          : null}

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
