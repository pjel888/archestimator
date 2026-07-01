import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

/**
 * Backwards-compatible alias. The canonical, sensitive-column-free list-row
 * contract lives in `@/lib/estimates/project-estimate-list-row`; the table no
 * longer extends the full generated database estimates row.
 */
export type ProjectEstimateTableRow = ProjectEstimateListRow;

export type EditableEstimateTextField = "name" | "notes" | "sheetCode";
