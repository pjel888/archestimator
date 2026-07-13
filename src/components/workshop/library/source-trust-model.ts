import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import { DEFAULT_PRICE_FRESHNESS_POLICY, getPriceFreshness } from "@/lib/estimate-health";
import type { ComponentLifecycleState, EstimateRowItem, EstimateRowLinkState } from "@/lib/estimates/types";

export const COMPONENT_FACET_STALE_DAYS = 90;
export const COMPONENT_FACET_VERY_STALE_DAYS = 180;

export type ComponentPricingFreshness = "any" | "fresh" | "stale" | "very-stale" | "missing";

export const COMPONENT_LIFECYCLE_FACET_LABELS: Record<ComponentLifecycleState, string> = {
  draft: "Draft",
  in_production: "In production",
  available: "Available",
  discontinued: "Discontinued",
  archived: "Archived",
};

export const COMPONENT_PRICING_FRESHNESS_LABELS: Record<Exclude<ComponentPricingFreshness, "any">, string> = {
  fresh: "Fresh price",
  stale: "Stale price",
  "very-stale": "Very stale price",
  missing: "Missing price source",
};

export type SourceTrustChipTone = "neutral" | "success" | "warning" | "danger";

export type SourceTrustChipSpec = {
  id: string;
  label: string;
  tone: SourceTrustChipTone;
  title?: string;
};

export type LibraryCommitTrustGateAction = "insert" | "replace";

export type LibraryCommitTrustGateReason = {
  id: string;
  label: string;
  tone: SourceTrustChipTone;
  description: string;
};

export type LibraryCommitTrustGateResult = {
  severity: "pass" | "warn" | "block";
  title: string;
  summary: string;
  confirmLabel: string;
  cancelLabel: string;
  reasons: LibraryCommitTrustGateReason[];
};

export type TemplateDependencyHealthSeverity = "healthy" | "warning" | "blocked";

export type TemplateDependencyHealthIssue = {
  id: string;
  label: string;
  tone: SourceTrustChipTone;
  severity: Exclude<TemplateDependencyHealthSeverity, "healthy">;
  count: number;
  description: string;
};

export type TemplateDependencyHealth = {
  severity: TemplateDependencyHealthSeverity;
  rowCount: number;
  issues: TemplateDependencyHealthIssue[];
  blockedIssues: TemplateDependencyHealthIssue[];
  warningIssues: TemplateDependencyHealthIssue[];
};

export type ComponentSourceTrustInput = {
  pricingDate?: string | null;
  pricingSource?: string | null;
  confidence?: string | null;
  lifecycleState?: ComponentLifecycleState | null;
};

const FRESHNESS_TONE: Record<Exclude<ComponentPricingFreshness, "any">, SourceTrustChipTone> = {
  fresh: "success",
  stale: "warning",
  "very-stale": "danger",
  missing: "neutral",
};

const LINK_STATE_LABELS: Record<EstimateRowLinkState, string> = {
  unlinked: "Not linked",
  "linked-clean": "Linked",
  "linked-overridden": "Local override",
  detached: "Detached",
  "source-changed": "Source changed",
};

function normalizeTrimmed(value?: string | null) {
  return value?.trim() ?? "";
}

function confidenceChipCopy(confidence: string): Pick<SourceTrustChipSpec, "label" | "tone" | "title"> {
  const normalized = confidence.toLowerCase();
  if (/^(high|quoted|verified|supplier quote|firm quote)/.test(normalized)) {
    return {
      label: "Verified source",
      tone: "success",
      title: "Marked as a verified or trusted source.",
    };
  }
  if (/^(accepted|accepted cost|reviewed|approved)/.test(normalized)) {
    return {
      label: "Accepted cost",
      tone: "success",
      title: "Marked as an accepted or reviewed cost source.",
    };
  }
  if (/^(low|unknown|unpriced)/.test(normalized)) {
    return {
      label: "Low confidence",
      tone: "warning",
      title: "User-entered or uncertain source. Review before reuse.",
    };
  }
  if (/^(medium|likely|catalog|plausible)/.test(normalized)) {
    return {
      label: "Likely source",
      tone: "neutral",
      title: "Plausible but not fully verified.",
    };
  }
  return {
    label: confidence,
    tone: "neutral",
    title: "Recorded confidence note.",
  };
}

export function getComponentPricingFreshness(
  item: Pick<ComponentSourceTrustInput, "pricingDate">,
  now: number = Date.now(),
): Exclude<ComponentPricingFreshness, "any"> {
  const raw = item.pricingDate?.trim();
  if (!raw) return "missing";
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "missing";
  return getPriceFreshness({
    timestamp: parsed,
    now,
    policy: DEFAULT_PRICE_FRESHNESS_POLICY,
  });
}

export function componentMatchesPricingFreshness(
  item: Pick<ComponentSourceTrustInput, "pricingDate">,
  freshness: Exclude<ComponentPricingFreshness, "any">,
  now: number,
) {
  const itemFreshness = getComponentPricingFreshness(item, now);
  if (freshness === "stale") return itemFreshness === "stale" || itemFreshness === "very-stale";
  return itemFreshness === freshness;
}

function pricingFreshnessChip(
  input: Pick<ComponentSourceTrustInput, "pricingDate">,
  now = Date.now(),
): SourceTrustChipSpec | null {
  const freshness = getComponentPricingFreshness(input, now);
  if (freshness === "fresh" || freshness === "missing") return null;
  return {
    id: `pricing-${freshness}`,
    label: COMPONENT_PRICING_FRESHNESS_LABELS[freshness],
    tone: FRESHNESS_TONE[freshness],
    title: input.pricingDate ? `Pricing date: ${input.pricingDate}` : "No pricing date recorded. Add one to track freshness.",
  };
}

function confidenceChip(input: Pick<ComponentSourceTrustInput, "confidence">): SourceTrustChipSpec | null {
  const confidence = normalizeTrimmed(input.confidence);
  if (!confidence) return null;
  const copy = confidenceChipCopy(confidence);
  return {
    id: `confidence-${confidence.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...copy,
  };
}

function lifecycleChip(input: Pick<ComponentSourceTrustInput, "lifecycleState">): SourceTrustChipSpec | null {
  const lifecycle = input.lifecycleState ?? "available";
  if (lifecycle === "available") return null;
  return {
    id: `lifecycle-${lifecycle}`,
    label: COMPONENT_LIFECYCLE_FACET_LABELS[lifecycle],
    tone: lifecycle === "discontinued" ? "warning" : "neutral",
    title: `Lifecycle: ${COMPONENT_LIFECYCLE_FACET_LABELS[lifecycle]}`,
  };
}

function sourcePresenceChip(input: Pick<ComponentSourceTrustInput, "pricingSource">): SourceTrustChipSpec | null {
  if (normalizeTrimmed(input.pricingSource)) return null;
  return {
    id: "source-missing",
    label: "Missing price source",
    tone: "warning",
    title: "Pricing source is not set",
  };
}

function addGateReason(
  reasons: LibraryCommitTrustGateReason[],
  reason: LibraryCommitTrustGateReason,
) {
  if (reasons.some((candidate) => candidate.id === reason.id)) return;
  reasons.push(reason);
}

function normalizedCompareValue(value?: string | null) {
  return value?.trim() ?? "";
}

export function getLibraryCommitTrustGate(
  item: EstimateRowItem,
  options: {
    action: LibraryCommitTrustGateAction;
    existingRow?: EstimateRowItem | null;
    now?: number;
  },
): LibraryCommitTrustGateResult {
  const reasons: LibraryCommitTrustGateReason[] = [];
  const freshness = getComponentPricingFreshness(item, options.now);
  const lifecycle = item.lifecycleState ?? "available";
  const confidence = normalizeTrimmed(item.confidence).toLowerCase();
  const pricingSource = normalizeTrimmed(item.pricingSource);

  if (lifecycle === "archived") {
    addGateReason(reasons, {
      id: "archived-component",
      label: "Archived component",
      tone: "danger",
      description: "Archived Library components are blocked from new estimate commits.",
    });
  } else if (lifecycle === "discontinued") {
    addGateReason(reasons, {
      id: "discontinued-component",
      label: "Discontinued component",
      tone: "warning",
      description: "This component is discontinued. Confirm it still belongs in the estimate.",
    });
  } else if (lifecycle === "draft" || lifecycle === "in_production") {
    addGateReason(reasons, {
      id: `lifecycle-${lifecycle}`,
      label: COMPONENT_LIFECYCLE_FACET_LABELS[lifecycle],
      tone: "warning",
      description: "This component is not marked available. Review before committing it to cost.",
    });
  }

  if (freshness === "very-stale") {
    addGateReason(reasons, {
      id: "very-stale-price",
      label: "Very stale price",
      tone: "danger",
      description: "The pricing date is older than the very-stale threshold.",
    });
  } else if (freshness === "stale") {
    addGateReason(reasons, {
      id: "stale-price",
      label: "Stale price",
      tone: "warning",
      description: "The pricing date is outside the current review window.",
    });
  } else if (freshness === "missing") {
    addGateReason(reasons, {
      id: "missing-price-date",
      label: "Missing price source",
      tone: "warning",
      description: "The pricing date is missing or unreadable.",
    });
  }

  if (!pricingSource) {
    addGateReason(reasons, {
      id: "missing-pricing-source",
      label: "Missing price source",
      tone: "warning",
      description: "No pricing source is recorded for this Library item.",
    });
  }

  if (!confidence || /^(low|unknown|unpriced)/.test(confidence)) {
    addGateReason(reasons, {
      id: "low-confidence",
      label: "Low confidence",
      tone: "warning",
      description: "The source confidence is missing or low.",
    });
  }

  if (item.linkState === "source-changed" || options.existingRow?.linkState === "source-changed") {
    addGateReason(reasons, {
      id: "source-changed",
      label: "Source changed",
      tone: "warning",
      description: "The linked source changed after this row was last reviewed.",
    });
  }

  const existingImage = normalizedCompareValue(options.existingRow?.imageUrl);
  const incomingImage = normalizedCompareValue(item.imageUrl);
  if (existingImage && incomingImage && existingImage !== incomingImage) {
    addGateReason(reasons, {
      id: "thumbnail-mismatch",
      label: "Thumbnail mismatch",
      tone: "warning",
      description: "The current row thumbnail differs from the incoming Library item.",
    });
  }

  const hasBlockingReason = reasons.some((reason) => reason.id === "archived-component");
  const severity: LibraryCommitTrustGateResult["severity"] = hasBlockingReason ? "block" : reasons.length ? "warn" : "pass";
  const isReplace = options.action === "replace";
  return {
    severity,
    title: hasBlockingReason
      ? "Cannot commit archived source"
      : isReplace
        ? "Review source before replacing row"
        : "Review source before inserting row",
    summary: hasBlockingReason
      ? "This Library item cannot be committed to the estimate until it is restored or inserted as a project-specific manual row."
      : reasons.length
        ? "This source has trust warnings. Confirm before committing it to the estimate."
        : "This source is ready to commit.",
    confirmLabel: isReplace ? "Continue with replace" : "Continue with insert",
    cancelLabel: "Cancel",
    reasons,
  };
}

export function getComponentSourceTrustChips(
  item: ComponentSourceTrustInput,
  options: { now?: number } = {},
): SourceTrustChipSpec[] {
  return [
    pricingFreshnessChip(item, options.now),
    confidenceChip(item),
    lifecycleChip(item),
    sourcePresenceChip(item),
  ].filter((chip): chip is SourceTrustChipSpec => chip !== null);
}

function collectTemplateRows(template: EstimateTemplate) {
  const rows: EstimateRowItem[] = [];

  function visit(node: EstimateTemplate["nodes"][number]) {
    rows.push(...(node.estimateRowItems ?? []));
    node.children?.forEach(visit);
  }

  template.nodes.forEach(visit);
  return rows;
}

function pluralizeIssueLabel(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}

function countRows(rows: EstimateRowItem[], predicate: (row: EstimateRowItem) => boolean) {
  return rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);
}

function makeDependencyIssue(
  input: Omit<TemplateDependencyHealthIssue, "label"> & { label: string },
): TemplateDependencyHealthIssue {
  return {
    ...input,
    label: pluralizeIssueLabel(input.label, input.count),
  };
}

function lowConfidence(confidence?: string | null) {
  const normalized = normalizeTrimmed(confidence).toLowerCase();
  return !normalized || /^(low|unknown|unpriced)/.test(normalized);
}

function worstFreshnessForRows(rows: EstimateRowItem[], now = Date.now()): Exclude<ComponentPricingFreshness, "any"> {
  const rank: Record<Exclude<ComponentPricingFreshness, "any">, number> = {
    fresh: 0,
    stale: 1,
    "very-stale": 2,
    missing: 3,
  };
  return rows.reduce<Exclude<ComponentPricingFreshness, "any">>((worst, row) => {
    const freshness = getComponentPricingFreshness(row, now);
    return rank[freshness] > rank[worst] ? freshness : worst;
  }, "fresh");
}

function rowLinkState(row: EstimateRowItem): EstimateRowLinkState {
  if (row.linkState) return row.linkState;
  return row.sourceLibraryItemId ? "linked-clean" : "unlinked";
}

function templateLinkChip(rows: EstimateRowItem[]): SourceTrustChipSpec {
  if (rows.length === 0) {
    return {
      id: "template-no-rows",
      label: "No rows",
      tone: "neutral",
      title: "This template does not contain row items yet",
    };
  }

  const linkedRows = rows.filter((row) => row.sourceLibraryItemId && rowLinkState(row) !== "detached").length;
  return {
    id: "template-linked-rows",
    label: `${linkedRows}/${rows.length} linked rows`,
    tone: linkedRows === rows.length ? "success" : linkedRows === 0 ? "warning" : "neutral",
    title: `${linkedRows} of ${rows.length} template rows reference library components`,
  };
}

function templateLinkStateChip(rows: EstimateRowItem[]): SourceTrustChipSpec | null {
  const counts = new Map<EstimateRowLinkState, number>();
  for (const row of rows) {
    const state = rowLinkState(row);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }

  const state = counts.has("source-changed")
    ? "source-changed"
    : counts.has("linked-overridden")
      ? "linked-overridden"
      : counts.has("detached")
        ? "detached"
        : null;
  if (!state) return null;

  return {
    id: `template-${state}`,
    label: LINK_STATE_LABELS[state],
    tone: state === "source-changed" || state === "detached" ? "warning" : "neutral",
    title: `${counts.get(state) ?? 0} template rows are ${LINK_STATE_LABELS[state].toLowerCase()}`,
  };
}

export function getTemplateSourceTrustChips(
  template: EstimateTemplate,
  options: { now?: number } = {},
): SourceTrustChipSpec[] {
  const rows = collectTemplateRows(template);
  const freshness = rows.length > 0 ? worstFreshnessForRows(rows, options.now) : "missing";
  return [
    templateLinkChip(rows),
    freshness === "fresh" || freshness === "missing"
      ? null
      : {
          id: `template-pricing-${freshness}`,
          label: COMPONENT_PRICING_FRESHNESS_LABELS[freshness],
          tone: FRESHNESS_TONE[freshness],
          title: "Worst pricing freshness among template rows",
        },
    templateLinkStateChip(rows),
  ].filter((chip): chip is SourceTrustChipSpec => chip !== null);
}

export function getTemplateDependencyHealth(
  template: EstimateTemplate,
  options: { now?: number } = {},
): TemplateDependencyHealth {
  const rows = collectTemplateRows(template);
  const now = options.now ?? Date.now();
  const issues: TemplateDependencyHealthIssue[] = [];

  const archivedCount = countRows(rows, (row) => row.lifecycleState === "archived");
  if (archivedCount > 0) {
    issues.push(makeDependencyIssue({
      id: "archived-dependency",
      label: "Archived dependency",
      tone: "danger",
      severity: "blocked",
      count: archivedCount,
      description: "Archived components are hidden from browse and blocked from new inserts.",
    }));
  }

  const discontinuedCount = countRows(rows, (row) => row.lifecycleState === "discontinued");
  if (discontinuedCount > 0) {
    issues.push(makeDependencyIssue({
      id: "discontinued-dependency",
      label: "Discontinued dependency",
      tone: "warning",
      severity: "warning",
      count: discontinuedCount,
      description: "No longer recommended. Inserting requires confirmation.",
    }));
  }

  const draftCount = countRows(rows, (row) => row.lifecycleState === "draft" || row.lifecycleState === "in_production");
  if (draftCount > 0) {
    issues.push(makeDependencyIssue({
      id: "draft-dependency",
      label: "Draft dependency",
      tone: "warning",
      severity: "warning",
      count: draftCount,
      description: "This template references components that are not marked available yet.",
    }));
  }

  const sourceChangedCount = countRows(rows, (row) => rowLinkState(row) === "source-changed");
  if (sourceChangedCount > 0) {
    issues.push(makeDependencyIssue({
      id: "source-changed-dependency",
      label: "Source changed dependency",
      tone: "warning",
      severity: "warning",
      count: sourceChangedCount,
      description: "The linked library source changed after this row was captured.",
    }));
  }

  const detachedCount = countRows(rows, (row) => rowLinkState(row) === "detached");
  if (detachedCount > 0) {
    issues.push(makeDependencyIssue({
      id: "detached-dependency",
      label: "Detached dependency",
      tone: "warning",
      severity: "warning",
      count: detachedCount,
      description: "Detached components are no longer linked to a library source.",
    }));
  }

  const veryStaleCount = countRows(rows, (row) => getComponentPricingFreshness(row, now) === "very-stale");
  if (veryStaleCount > 0) {
    issues.push(makeDependencyIssue({
      id: "very-stale-price",
      label: "Very stale price",
      tone: "warning",
      severity: "warning",
      count: veryStaleCount,
      description: "At least one template row uses pricing older than 180 days.",
    }));
  }

  const staleCount = countRows(rows, (row) => getComponentPricingFreshness(row, now) === "stale");
  if (staleCount > 0) {
    issues.push(makeDependencyIssue({
      id: "stale-price",
      label: "Stale price",
      tone: "warning",
      severity: "warning",
      count: staleCount,
      description: "At least one template row uses pricing older than 90 days.",
    }));
  }

  const missingDateCount = countRows(rows, (row) => getComponentPricingFreshness(row, now) === "missing");
  if (missingDateCount > 0) {
    issues.push(makeDependencyIssue({
      id: "missing-price-date",
      label: "Missing price source",
      tone: "warning",
      severity: "warning",
      count: missingDateCount,
      description: "At least one template row is missing a pricing date.",
    }));
  }

  const lowConfidenceCount = countRows(rows, (row) => lowConfidence(row.confidence));
  if (lowConfidenceCount > 0) {
    issues.push(makeDependencyIssue({
      id: "low-confidence",
      label: "Low-confidence dependency",
      tone: "warning",
      severity: "warning",
      count: lowConfidenceCount,
      description: "At least one template row is missing verified confidence text.",
    }));
  }

  const blockedIssues = issues.filter((issue) => issue.severity === "blocked");
  const warningIssues = issues.filter((issue) => issue.severity === "warning");
  return {
    severity: blockedIssues.length > 0 ? "blocked" : warningIssues.length > 0 ? "warning" : "healthy",
    rowCount: rows.length,
    issues,
    blockedIssues,
    warningIssues,
  };
}
