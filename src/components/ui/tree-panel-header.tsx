"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar, type HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { TabStrip, type TabStripItem } from "@/components/ui/tab-strip";
import { cn } from "@/lib/ui/cn";

export type TreePanelHeaderProps = {
  /** Accessible name for the icon toolbar row. */
  ariaLabel: string;
  /** Lowercase noun used in generated action labels ("tree", "library tree"). */
  labelPrefix: string;
  onFilter?: () => void;
  onGroup?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  /** Extra start-slot actions rendered after the built-in search toggle. */
  startActions?: HeaderIconToolbarAddAction[];
  startActionsLabel?: string;
  leadingActions?: HeaderIconToolbarAddAction[];
  leadingActionsLabel?: string;
  addActions?: HeaderIconToolbarAddAction[];
  onAdd?: () => void;
  addVisibleLabel?: string;
  addDisabled?: boolean;
  showDefaultActions?: boolean;
  /**
   * Search disclosure. Providing `onSearchValueChange` enables the toggle:
   * a magnifier icon in the toolbar start slot opens a dropdown SearchInput
   * panel. The panel closes on Escape and on pointer-down outside the header.
   */
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  /** Controlled open state for the search dropdown (uncontrolled when omitted). */
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  /** Receives the dropdown's input element, e.g. for shortcut-driven focus. */
  searchInputRef?: MutableRefObject<HTMLInputElement | null>;
  /** Tab strip rendered under the toolbar. */
  tabs?: readonly TabStripItem[];
  activeTab?: string;
  tabsAriaLabel?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
  /** Extra header content (e.g. a view-mode menu) inside the sticky stack. */
  children?: ReactNode;
};

/**
 * Sticky header for tree side panels: a `HeaderIconToolbar` with a
 * search-icon disclosure that drops a `SearchInput` panel over the content
 * below, plus an optional `TabStrip`.
 */
export const TreePanelHeader = forwardRef<HTMLDivElement, TreePanelHeaderProps>(function TreePanelHeader(
  {
    ariaLabel,
    labelPrefix,
    onFilter,
    onGroup,
    onExpandAll,
    onCollapseAll,
    startActions = [],
    startActionsLabel,
    leadingActions,
    leadingActionsLabel,
    addActions,
    onAdd,
    addVisibleLabel,
    addDisabled,
    showDefaultActions,
    searchValue = "",
    onSearchValueChange,
    searchPlaceholder,
    searchLabel,
    searchOpen,
    onSearchOpenChange,
    searchInputRef,
    tabs,
    activeTab,
    tabsAriaLabel,
    onTabChange,
    className,
    children,
  },
  ref,
) {
  const searchEnabled = Boolean(onSearchValueChange);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = searchEnabled && (searchOpen ?? uncontrolledOpen);
  const searchRootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();
  const searchActive = open || searchValue.length > 0;

  const setOpen = useCallback(
    (next: boolean) => {
      if (searchOpen === undefined) setUncontrolledOpen(next);
      onSearchOpenChange?.(next);
    },
    [onSearchOpenChange, searchOpen],
  );

  const assignInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      if (searchInputRef) searchInputRef.current = element;
    },
    [searchInputRef],
  );

  useEffect(() => {
    if (!open) return undefined;
    const focusFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && searchRootRef.current?.contains(target)) return;
      // An active query keeps the panel open: outside clicks only dismiss an
      // empty search. Clearing or Escape closes it explicitly.
      if (searchValue.length > 0) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  }, [open, searchValue, setOpen]);

  const toolbarStartActions: HeaderIconToolbarAddAction[] = searchEnabled
    ? [
        {
          label: open ? `Hide ${labelPrefix} search` : `Show ${labelPrefix} search`,
          icon: <MagnifyingGlass size={12} weight="regular" aria-hidden="true" />,
          onClick: () => setOpen(!open),
          pressed: searchActive,
          ariaControls: panelId,
          ariaExpanded: open,
          className: searchActive
            ? "bg-surfaceMuted text-ink hover:bg-surfaceMuted focus-visible:bg-surfaceMuted"
            : undefined,
        },
        ...startActions,
      ]
    : startActions;

  return (
    <div ref={ref} className={cn("sticky top-0 z-20 shrink-0 bg-white", className)}>
      <div ref={searchRootRef} className="relative">
        <HeaderIconToolbar
          ariaLabel={ariaLabel}
          labelPrefix={labelPrefix}
          onFilter={onFilter}
          onGroup={onGroup}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
          startActions={toolbarStartActions}
          startActionsLabel={startActionsLabel ?? `${labelPrefix} search`}
          leadingActions={leadingActions}
          leadingActionsLabel={leadingActionsLabel}
          addActions={addActions}
          onAdd={onAdd}
          addVisibleLabel={addVisibleLabel}
          addDisabled={addDisabled}
          showDefaultActions={showDefaultActions}
        />
        {open ? (
          <div
            id={panelId}
            role="search"
            className="absolute left-0 right-0 top-[40px] z-30 rounded-xs border border-hairline bg-white shadow-sm"
            data-tree-search-panel="true"
          >
            <SearchInput
              ref={assignInputRef}
              wrapperClassName="w-full"
              placeholder={searchPlaceholder}
              aria-label={searchLabel ?? searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchValueChange?.(event.target.value)}
              onClear={() => {
                onSearchValueChange?.("");
                inputRef.current?.focus();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>
      {tabs && tabs.length > 0 && activeTab !== undefined ? (
        <TabStrip
          tabs={tabs}
          activeTab={activeTab}
          ariaLabel={tabsAriaLabel ?? `${labelPrefix} views`}
          onTabChange={onTabChange}
        />
      ) : null}
      {children}
    </div>
  );
});
