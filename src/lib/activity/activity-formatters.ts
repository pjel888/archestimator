import type { ActivityActor } from "./types";

const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const fieldLabels: Record<string, string> = {
  quantity: "Quantity",
  unitCost: "Unit cost",
  unit_cost: "Unit cost",
  lineTotal: "Line total",
  line_total: "Line total",
  contingencyPercentage: "Adjustment percentage",
  contingency_percentage: "Adjustment percentage",
  miscCost: "Misc cost",
  misc_cost: "Misc cost",
  material: "Material",
  description: "Description",
  supplier: "Supplier",
  unit: "Unit",
  sheetCode: "Estimate code",
  sheet_code: "Estimate code",
  name: "Name",
  budget: "Budget",
  linkState: "Library status",
  link_state: "Library status",
};

export function stripUnsafeText(value: unknown, fallback = "Activity"): string {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const cleaned = text
    .replace(uuidPattern, "")
    .replace(emailPattern, "")
    .replace(/User\s+(?=[0-9a-f]{8}-)/gi, "")
    .replace(/\b(row_updated|row_replaced|row_deleted|row_added|row_blank_added|sheet_code_updated|sheet_metadata_updated|node_created|node_renamed|node_deleted_with_children|tree_reordered|tab_created|tab_renamed|tab_reordered|tab_duplicated|tab_archived|tab_deleted|template_inserted|revision_requested|accepted|server_action|metadata_json|sourceSnapshot|oldSnapshot|newSnapshot|changedFields|correlation_id|target_row_id|estimate_node_id|linked-clean|linked-overridden|source-changed|detached|COMMENT|DECISION|EVENT)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

export function formatActivityFieldLabel(field: string): string {
  if (fieldLabels[field]) return fieldLabels[field];
  return field
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

export function formatActivityValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (/linkState|link_state/i.test(field) && typeof value === "string") {
    const linkStateLabels: Record<string, string> = {
      "linked-clean": "Using library values",
      "linked-overridden": "Customized from library",
      "source-changed": "Library source changed",
      detached: "Detached from library",
    };
    return linkStateLabels[value] ?? "Library status updated";
  }
  if (typeof value === "number") {
    if (/cost|total|budget|delta|amount|price/i.test(field)) return formatPeso(value);
    if (/percentage|percent|contingency/i.test(field)) return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value)}%`;
    return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString("en-PH");
  if (Array.isArray(value)) return value.map((item) => stripUnsafeText(item, "Item")).join(", ");
  if (typeof value === "object") return "Updated value";
  return stripUnsafeText(value, "Value");
}

export function formatActivityActor(actorId?: string | null, actorLabel?: string | null, audience: "owner" | "client" | "support" | "system" = "owner"): ActivityActor {
  const label = stripUnsafeText(actorLabel, "");
  const isUnsafeLabel = !label || uuidPattern.test(String(actorLabel ?? "")) || emailPattern.test(String(actorLabel ?? ""));
  uuidPattern.lastIndex = 0;
  emailPattern.lastIndex = 0;

  if (audience === "client") {
    return { kind: "client", displayName: label && !isUnsafeLabel ? label : "Project team", isSafeForClient: true };
  }

  if (label && !isUnsafeLabel) {
    return { id: actorId ?? undefined, kind: "user", displayName: label, isSafeForClient: true };
  }

  if (actorId) return { id: actorId, kind: "unknown", displayName: "Unknown user", isSafeForClient: false };
  return { kind: "system", displayName: "System", isSafeForClient: true };
}
