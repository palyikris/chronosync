import React, {
  useCallback,
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

type DropdownPlacement = "top" | "bottom";

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
    const [isInvalid, setIsInvalid] = useState(false);
    const [openPlacement, setOpenPlacement] =
      useState<DropdownPlacement>("bottom");
    const [menuStyles, setMenuStyles] = useState<React.CSSProperties | null>(
      null,
    );
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const resolvedPlacementRef = useRef<DropdownPlacement | null>(null);
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

    const shouldShowSearch = options.length > 5;
    const listMaxHeight = useMemo(() => {
      const optionHeight = 36;
      const searchHeight = shouldShowSearch ? 56 : 0;
      const estimatedContentHeight =
        filteredOptions.length * optionHeight + searchHeight + 8;

      return Math.min(Math.max(estimatedContentHeight, 120), 320);
    }, [filteredOptions.length, shouldShowSearch]);

    const getMenuPosition = useCallback((
      lockedPlacement?: DropdownPlacement | null,
    ): { styles: React.CSSProperties; placement: DropdownPlacement } | null => {
      const trigger = triggerRef.current;

      if (!trigger) {
        return null;
      }

      const spacing = 6;
      const viewportPadding = 12;
      const rect = trigger.getBoundingClientRect();
      const spaceAbove = rect.top - viewportPadding;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const prefersTop = menuPlacement === "top";
      const canOpenTop = spaceAbove >= listMaxHeight;
      const canOpenBottom = spaceBelow >= listMaxHeight;

      const adaptivePlacement: DropdownPlacement = prefersTop
        ? canOpenTop || (!canOpenBottom && spaceAbove > spaceBelow)
          ? "top"
          : "bottom"
        : !canOpenBottom && spaceAbove > spaceBelow
          ? "top"
          : "bottom";

      const placement = lockedPlacement ?? adaptivePlacement;
      const placeTop = placement === "top";

      const availableHeight = Math.max(
        96,
        (placeTop ? spaceAbove : spaceBelow) - spacing,
      );
      const panelMaxHeight = Math.min(listMaxHeight, availableHeight);

      return {
        placement,
        styles: {
          position: "fixed",
          left: rect.left,
          top: placeTop ? rect.top - spacing : rect.bottom + spacing,
          width: rect.width,
          maxHeight: panelMaxHeight,
          zIndex: 1000,
          transformOrigin: placeTop ? "bottom" : "top",
          transform: placeTop ? "translateY(-100%)" : undefined,
        },
      };
    }, [listMaxHeight, menuPlacement]);

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
        resolvedPlacementRef.current = null;
        return;
      }

      const updateMenuPosition = () => {
        const nextPosition = getMenuPosition(resolvedPlacementRef.current);

        if (!nextPosition) {
          return;
        }

        if (!resolvedPlacementRef.current) {
          resolvedPlacementRef.current = nextPosition.placement;
        }

        setMenuStyles(nextPosition.styles);
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


      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", updateMenuPosition);
        window.removeEventListener("scroll", updateMenuPosition, true);
      };
    }, [isOpen, getMenuPosition]);

    useEffect(() => {
      if (!isOpen) return;
      const focusFrame = window.requestAnimationFrame(() => {
        const selected = dropdownRef.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]:not(:disabled)');
        const first = dropdownRef.current?.querySelector<HTMLButtonElement>('[role="option"]:not(:disabled)');
        (searchInputRef.current ?? selected ?? first)?.focus();
      });
      return () => window.cancelAnimationFrame(focusFrame);
    }, [isOpen]);

    const handleSelect = (nextValue: string) => {
      setIsOpen(false);
      setIsInvalid(false);
      triggerRef.current?.focus();

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
    const resolvedDisabledReason =
      disabledReason ?? t("common.disabled", "Disabled");
    const openAnimationClass =
      openPlacement === "top"
        ? "animate-[select-popover-in-from-top_300ms_cubic-bezier(0.22,0.7,0.24,1)]"
        : "animate-[select-popover-in-from-bottom_300ms_cubic-bezier(0.22,0.7,0.24,1)]";

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
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={props["aria-describedby"]}
          aria-required={props.required}
          aria-invalid={isInvalid || props["aria-invalid"]}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${controlId}-options` : undefined}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isOpen) {
              event.preventDefault();
              event.stopPropagation();
              setIsOpen(false);
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!isOpen) triggerRef.current?.click();
            }
          }}
          onClick={() => {
            if (disabled) {
              return;
            }

            setIsOpen((open) => {
              if (!open) {
                const nextPosition = getMenuPosition();

                if (nextPosition) {
                  resolvedPlacementRef.current = nextPosition.placement;
                  setOpenPlacement(nextPosition.placement);
                  setMenuStyles(nextPosition.styles);
                }

                setSearchQuery("");
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
                        "relative origin-bottom rounded-md border border-border bg-surface-strong px-2.5 py-1.5 text-[11px] leading-tight text-muted shadow-lg transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)]",
                        isDisabledHintOpen
                          ? "translate-y-0 scale-100 opacity-100 blur-0"
                          : "translate-y-0.5 scale-[0.98] opacity-0",
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
                style={menuStyles ?? undefined}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border border-border-strong bg-surface-strong/95 shadow-[0_12px_32px_rgba(75,87,57,0.14)] backdrop-blur-2xl",
                  !menuStyles && "invisible",
                )}
                aria-hidden={!menuStyles}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  } else if (event.key === "Tab") {
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                    if (event.target === searchInputRef.current && ["Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const items = Array.from(dropdownRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []);
                    const index = items.indexOf(document.activeElement as HTMLButtonElement);
                    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
                      : event.key === "ArrowDown" ? (index + 1) % items.length
                      : (index <= 0 ? items.length - 1 : index - 1);
                    items[nextIndex]?.focus();
                  }
                }}
              >
                <div className={cn("flex min-h-0 flex-1 flex-col", openAnimationClass)}>
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
                          onChange={(event) =>
                            setSearchQuery(event.target.value)
                          }
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
                    aria-label={accessibleLabel}
                    className="motion-list-fast min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
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
                              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors duration-300 ease-out",
                              isSelected
                                ? "bg-black/6 text-text"
                                : "text-text hover:bg-black/[0.035]",
                              option.disabled &&
                                "cursor-not-allowed opacity-50",
                            )}
                            onClick={() => {
                              if (!option.disabled) {
                                handleSelect(option.value);
                              }
                            }}
                          >
                            <span className="truncate">{option.label}</span>
                            {isSelected ? (
                              <Check className="motion-pop h-4 w-4 shrink-0 text-primary-strong" />
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted">
                        {t("common.noOptionsFound")}
                      </div>
                    )}
                  </div>
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
          onInvalid={(event) => {
            event.preventDefault();
            setIsInvalid(true);
            triggerRef.current?.focus();
          }}
        >
          {children}
        </select>
      </div>
    );
  },
);

Select.displayName = "Select";
