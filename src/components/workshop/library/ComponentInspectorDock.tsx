"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { ImageSquare } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { COMPONENT_LIFECYCLE_FACET_LABELS } from "@/components/workshop/library/component-facet-filter-model";
import {
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import { getCostLibraryComponentUsage } from "@/lib/component-library/actions";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { EstimateRowItem } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";

const PRICE_HISTORY_PREVIEW_COUNT = 5;
const INSPECTOR_GLASS_DIVIDER_CLASS = "border-[color:var(--glass-border)]";
const INSPECTOR_GLASS_THUMBNAIL_CLASS = "border-[color:var(--glass-border)] bg-white/45";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

type ComponentUsageCounts = {
  templateRowCount: number;
  estimateRowCount: number;
};

function isNextImageSafeSource(src: string) {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  return false;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-2 py-1">
      <dt className="text-[9px] font-medium leading-3 text-tertiary">{label}</dt>
      <dd className="min-w-0 text-[10px] leading-4 text-ink">{children}</dd>
    </div>
  );
}

/**
 * Right-dock detail inspector for the Components tab (closes audit
 * P1-3/C1-C5): key-value detail, price history, and used-in counts for the
 * selected component. Esc closes; focus returns to the selected card at the
 * call site.
 */
export function ComponentInspectorDock({
  item,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  duplicatePending = false,
  canEdit = true,
  canDuplicate = true,
  canArchive = true,
  promoteAction,
}: {
  item: EstimateRowItem;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  duplicatePending?: boolean;
  canEdit?: boolean;
  canDuplicate?: boolean;
  canArchive?: boolean;
  promoteAction?: { label: string; pending?: boolean; onClick: () => void };
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const [usageState, setUsageState] = useState<{
    itemId: string;
    counts: ComponentUsageCounts | null;
    error: boolean;
  }>({ itemId: item.id, counts: null, error: false });
  const [historyVisibility, setHistoryVisibility] = useState({ itemId: item.id, showAll: false });
  const compactViewport = useMediaQuery("(max-width: 1023px)");
  const usage = usageState.itemId === item.id ? usageState.counts : null;
  const usageError = usageState.itemId === item.id ? usageState.error : false;
  const showAllHistory = historyVisibility.itemId === item.id ? historyVisibility.showAll : false;

  useEffect(() => {
    let stale = false;
    getCostLibraryComponentUsage({ itemId: item.id })
      .then((counts) => {
        if (!stale) setUsageState({ itemId: item.id, counts, error: false });
      })
      .catch(() => {
        if (!stale) setUsageState({ itemId: item.id, counts: null, error: true });
      });
    return () => {
      stale = true;
    };
  }, [item.id]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const name = item.name?.trim() || item.material;
  const taxonomyPath = (item.categoryPath ?? []).join(" / ") || item.category;
  const priceHistory = (item.history ?? []).filter((entry) => entry.type === "price");
  const visibleHistory = showAllHistory ? priceHistory : priceHistory.slice(0, PRICE_HISTORY_PREVIEW_COUNT);
  const lifecycle = item.lifecycleState ?? "available";

  const detailsPanel = (
      <section
        className={cn("flex h-full min-h-0 flex-col overflow-hidden", librarySurfaceClass(surfaceVariant, "rightDock"))}
        aria-label={`Component details for ${name}`}
        data-component-inspector-dock="true"
      >
        <header className={cn("flex h-10 shrink-0 items-center justify-between gap-2 px-2", librarySurfaceClass(surfaceVariant, "railPanelHeader"))}>
          <h2 className="truncate text-[11px] font-medium leading-4 text-ink">Component details</h2>
          <div className="flex items-center gap-1">
            <DropdownMenu
              trigger={
                <Button variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0 text-tertiary" aria-label="Component actions">
                  <span aria-hidden="true">⋯</span>
                </Button>
              }
              align="end"
            >
              <DropdownMenu.Item
                label="Copy component ID"
                onClick={() => {
                  void navigator.clipboard?.writeText(item.id);
                }}
              />
              {canArchive ? <DropdownMenu.Item label="Archive component" destructive onClick={onArchive} /> : null}
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6 rounded-xs p-0 text-tertiary"
              aria-label="Close component details"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div
            className={cn(
              "relative h-[120px] w-[120px] overflow-hidden rounded-xs border",
              surfaceVariant === "glass" ? INSPECTOR_GLASS_THUMBNAIL_CLASS : "border-hairline bg-white",
            )}
          >
            {item.imageUrl && isNextImageSafeSource(item.imageUrl) ? (
              <Image src={item.imageUrl} alt={`${name} thumbnail`} fill sizes="120px" className="object-cover" />
            ) : item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={`${name} thumbnail`}
                fill
                sizes="120px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-tertiary" aria-hidden="true">
                <ImageSquare size={24} weight="regular" />
              </div>
            )}
          </div>
          <h3 className="mt-2 text-[12px] font-medium leading-4 text-ink">{name}</h3>
          <p className="mt-0.5 truncate text-[9px] leading-3 text-tertiary" title={taxonomyPath}>
            {taxonomyPath}
          </p>
          <dl className={cn("mt-3 border-t pt-2", surfaceVariant === "glass" ? INSPECTOR_GLASS_DIVIDER_CLASS : "border-hairline")}>
            <DetailRow label="Unit cost">
              <span className="font-medium tabular-nums">{pesoFormatter.format(item.itemCost)}</span>
              <span className="ml-1 text-[8px] text-tertiary">/ {item.unit}</span>
            </DetailRow>
            {item.miscCost > 0 ? (
              <DetailRow label="Misc cost">
                <span className="tabular-nums">{pesoFormatter.format(item.miscCost)}</span>
              </DetailRow>
            ) : null}
            <DetailRow label="Supplier">{item.supplier?.trim() || "No supplier"}</DetailRow>
            <DetailRow label="Brand">{item.brand?.trim() || "No brand"}</DetailRow>
            <DetailRow label="Pricing date">{item.pricingDate?.trim() || "Not set"}</DetailRow>
            <DetailRow label="Lifecycle">{COMPONENT_LIFECYCLE_FACET_LABELS[lifecycle]}</DetailRow>
            {typeof item.componentVersionNumber === "number" ? (
              <DetailRow label="Version">{`v${item.componentVersionNumber} · current`}</DetailRow>
            ) : null}
            {item.pricingSource?.trim() ? <DetailRow label="Source">{item.pricingSource}</DetailRow> : null}
          </dl>

          <section
            className={cn("mt-3 border-t pt-2", surfaceVariant === "glass" ? INSPECTOR_GLASS_DIVIDER_CLASS : "border-hairline")}
            aria-label="Price history"
          >
            <h4 className="text-[9px] font-medium leading-3 text-tertiary">Price history</h4>
            {priceHistory.length === 0 ? (
              <p className="mt-1 text-[10px] leading-4 text-tertiary">No recorded price changes.</p>
            ) : (
              <>
                <ul className="mt-1">
                  {visibleHistory.map((entry) => (
                    <li key={entry.id} className="flex items-baseline justify-between gap-2 py-1">
                      <span className="shrink-0 text-[9px] leading-3 tabular-nums text-tertiary">
                        {entry.effectiveAt.slice(0, 10)}
                      </span>
                      <span className="min-w-0 truncate text-right text-[10px] leading-4 tabular-nums text-ink" title={entry.summary}>
                        {entry.summary || entry.label}
                      </span>
                    </li>
                  ))}
                </ul>
                {priceHistory.length > PRICE_HISTORY_PREVIEW_COUNT ? (
                  <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    className="min-w-0 px-0 !text-[9px]"
                    onClick={() =>
                      setHistoryVisibility((current) => ({
                        itemId: item.id,
                        showAll: current.itemId === item.id ? !current.showAll : true,
                      }))
                    }
                  >
                    {showAllHistory ? "Show fewer entries" : `View all ${priceHistory.length} entries`}
                  </Button>
                ) : null}
              </>
            )}
          </section>

          <section
            className={cn("mt-3 border-t pt-2", surfaceVariant === "glass" ? INSPECTOR_GLASS_DIVIDER_CLASS : "border-hairline")}
            aria-label="Used in"
          >
            <h4 className="text-[9px] font-medium leading-3 text-tertiary">Used in</h4>
            <p className="mt-1 text-[10px] leading-4 text-ink" aria-live="polite">
              {usageError
                ? "Usage counts unavailable."
                : usage
                  ? `${usage.templateRowCount} ${usage.templateRowCount === 1 ? "template row" : "template rows"} · ${usage.estimateRowCount} ${usage.estimateRowCount === 1 ? "estimate row" : "estimate rows"}`
                  : "Counting usage…"}
            </p>
          </section>
        </div>

        <footer
          className={cn(
            "flex shrink-0 items-center gap-2 border-t p-2",
            surfaceVariant === "glass" ? "border-[color:var(--glass-border)] bg-white/30" : "border-hairline",
          )}
        >
          {promoteAction ? (
            <Button
              type="button"
              variant="primary"
              size="xs"
              className="min-w-0 flex-1 px-2"
              disabled={promoteAction.pending}
              onClick={promoteAction.onClick}
            >
              {promoteAction.pending ? "Promoting…" : promoteAction.label}
            </Button>
          ) : null}
          {canEdit ? (
            <Button type="button" variant={promoteAction ? "secondary" : "primary"} size="xs" className="min-w-0 flex-1 px-2" onClick={onEdit}>
              Edit component
            </Button>
          ) : null}
          {canDuplicate ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              className="min-w-0 px-2"
              disabled={duplicatePending}
              onClick={onDuplicate}
            >
              {duplicatePending ? "Duplicating…" : "Duplicate"}
            </Button>
          ) : null}
        </footer>
      </section>
  );

  if (compactViewport) {
    return (
      <aside
        className={cn(
          "fixed inset-x-2 bottom-2 z-[850] max-h-[46vh] overflow-hidden !text-[10px]",
          librarySurfaceClass(surfaceVariant, "rightDock"),
        )}
        aria-label="Component inspector"
      >
        {detailsPanel}
      </aside>
    );
  }

  return (
    <ResizableSidePanel
      side="right"
      ariaLabel="Component inspector"
      storageKey="component_inspector_dock_width"
      defaultWidth={380}
      minWidth={360}
      maxWidth={560}
    >
      {detailsPanel}
    </ResizableSidePanel>
  );
}
