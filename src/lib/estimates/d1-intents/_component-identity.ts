import "server-only";

export const PROJECT_COMPONENT_IDENTITY_SQL = `
  COALESCE(
    CASE
      WHEN json_extract(row_item.source_snapshot_json, '$.sourceType') IN ('project_component', 'promoted_project_component', 'promoted_express_component', 'express_component')
      THEN NULLIF(json_extract(row_item.source_snapshot_json, '$.sourceComponentId'), '')
    END,
    CASE
      WHEN json_extract(row_item.source_snapshot_json, '$.sourceType') IN ('project_component', 'promoted_project_component', 'promoted_express_component', 'express_component')
      THEN NULLIF(json_extract(row_item.source_snapshot_json, '$.sourceEstimateRowId'), '')
    END,
    NULLIF(json_extract(row_item.metadata_json, '$.projectComponentProjection.componentId'), ''),
    NULLIF(json_extract(row_item.metadata_json, '$.expressComponent.componentId'), ''),
    NULLIF(json_extract(row_item.metadata_json, '$.expressComponent.id'), '')
  )
`;

export const COMPONENT_IMPACT_CONFLICT_MESSAGE =
  "Component usage changed while this edit was open. Review the latest impact and try again.";

function readRevision(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 1;
}

export function buildComponentImpactFingerprint(
  rows: Array<{ row_id: string; row_revision: number | string }>,
) {
  return [...rows]
    .sort((left, right) => left.row_id.localeCompare(right.row_id))
    .map((row) => `${row.row_id}:${readRevision(row.row_revision)}`)
    .join("|");
}

export function buildLibraryComponentImpactFingerprint(
  rows: Array<{
    row_id: string;
    row_revision: number | string;
    link_state?: string | null;
    selected_price_option_id?: string | null;
  }>,
  priceOptions: Array<{
    id: string;
    updated_at: string;
    is_active: number | boolean;
    is_default: number | boolean;
  }>,
) {
  const rowFingerprint = [...rows]
    .sort((left, right) => left.row_id.localeCompare(right.row_id))
    .map((row) => [
      row.row_id,
      readRevision(row.row_revision),
      row.link_state ?? "linked-clean",
      row.selected_price_option_id ?? "",
    ].join(":"))
    .join("|");
  const optionFingerprint = [...priceOptions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((option) => [
      option.id,
      option.updated_at,
      Number(option.is_active) === 1 ? 1 : 0,
      Number(option.is_default) === 1 ? 1 : 0,
    ].join(":"))
    .join("|");
  return `rows[${rowFingerprint}]|options[${optionFingerprint}]`;
}
