import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/ui/cn";

export type TabItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  tabs: readonly TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "underline" | "pills";
  activationMode?: "automatic" | "manual";
  /** Accessible name for the tablist (announced by screen readers). */
  ariaLabel?: string;
  endAction?: ReactNode;
  getTabButtonProps?: (
    tab: TabItem,
    index: number,
    isActive: boolean,
  ) => Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "role" | "aria-selected" | "aria-controls" | "id" | "tabIndex">;
  onTabButtonMount?: (tab: TabItem, index: number, element: HTMLButtonElement | null) => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange">;

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ tabs, activeId, onChange, className, variant = "underline", activationMode = "automatic", ariaLabel, endAction, getTabButtonProps, onTabButtonMount, ...rootProps }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    };

    useEffect(() => {
      checkScroll();
      window.addEventListener("resize", checkScroll);
      return () => window.removeEventListener("resize", checkScroll);
    }, [tabs]);

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex = index;
      const enabledTabs = tabs.map((t, i) => ({ ...t, originalIndex: i })).filter(t => !t.disabled);
      const currentEnabledIndex = enabledTabs.findIndex(t => t.originalIndex === index);

      if (e.key === "Enter" || e.key === " ") {
        const currentTab = tabs[index];
        if (currentTab && !currentTab.disabled) {
          e.preventDefault();
          onChange(currentTab.id);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = enabledTabs[(currentEnabledIndex + 1) % enabledTabs.length];
        if (next) nextIndex = next.originalIndex;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = enabledTabs[(currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length];
        if (prev) nextIndex = prev.originalIndex;
      } else if (e.key === "Home") {
        e.preventDefault();
        if (enabledTabs.length > 0) nextIndex = enabledTabs[0].originalIndex;
      } else if (e.key === "End") {
        e.preventDefault();
        if (enabledTabs.length > 0) nextIndex = enabledTabs[enabledTabs.length - 1].originalIndex;
      }

      if (nextIndex !== index) {
        const nextTab = tabs[nextIndex];
        if (activationMode === "automatic") onChange(nextTab.id);
        const buttons = scrollContainerRef.current?.querySelectorAll('button[role="tab"]');
        if (buttons && buttons[nextIndex]) {
          (buttons[nextIndex] as HTMLButtonElement).focus();
        }
      }
    };

    return (
      <div
        {...rootProps}
        ref={ref}
        className={cn("relative flex w-full items-center", className)}
        data-navigation-tabs
      >
        <div className="relative min-w-0 flex-1">
          {canScrollLeft && (
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-surface to-transparent" />
          )}

          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className={cn(
              "flex w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
              variant === "underline" ? "border-b border-divider" : "gap-1",
            )}
            role="tablist"
            aria-label={ariaLabel}
            aria-orientation="horizontal"
          >
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeId;
              const tabButtonProps = getTabButtonProps?.(tab, index, isActive) ?? {};
              const {
                className: tabButtonClassName,
                disabled: tabButtonDisabled,
                onClick: onTabButtonClick,
                onKeyDown: onTabButtonKeyDown,
                ...extraTabButtonProps
              } = tabButtonProps;
              const isDisabled = Boolean(tab.disabled || tabButtonDisabled);
              return (
                <button
                  key={tab.id}
                  {...extraTabButtonProps}
                  ref={(element) => onTabButtonMount?.(tab, index, element)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  disabled={isDisabled}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    onTabButtonClick?.(event);
                    if (!event.defaultPrevented && !isDisabled) onChange(tab.id);
                  }}
                  onKeyDown={(event) => {
                    onTabButtonKeyDown?.(event);
                    if (!event.defaultPrevented) handleKeyDown(event, index);
                  }}
                  className={cn(
                    "group relative flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap px-3 !text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1",
                    isDisabled && "cursor-not-allowed opacity-50",
                    variant === "underline" && [
                      "border-b-2",
                      isActive
                        ? "border-brand-orange text-ink"
                        : "border-transparent text-tertiary/60 hover:border-divider hover:text-ink",
                    ],
                    variant === "pills" && [
                      "rounded-xs py-1.5",
                      isActive
                        ? "bg-surfaceMuted text-ink"
                        : "text-secondary hover:bg-surfaceMuted/50 hover:text-ink",
                    ],
                    tabButtonClassName,
                  )}
                >
                  {tab.icon && (
                    <span className={cn("shrink-0", isActive ? "text-ink" : "text-tertiary group-hover:text-secondary")}>
                      {tab.icon}
                    </span>
                  )}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[9px] font-medium text-ink">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {canScrollRight && (
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-surface to-transparent" />
          )}
        </div>
        {endAction ? <div className="ml-1 shrink-0">{endAction}</div> : null}
      </div>
    );
  }
);

Tabs.displayName = "Tabs";

export type TabPanelProps = {
  id: string;
  activeId: string;
  children: ReactNode;
  className?: string;
};

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ id, activeId, children, className, ...props }, ref) => {
    if (id !== activeId) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${id}`}
        aria-labelledby={`tab-${id}`}
        className={cn("pt-2", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabPanel.displayName = "TabPanel";
