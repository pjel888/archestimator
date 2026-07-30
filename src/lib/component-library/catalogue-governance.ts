export const CATALOGUE_ENTITY_KINDS = ["brand", "supplier"] as const;
export type CatalogueEntityKind = (typeof CATALOGUE_ENTITY_KINDS)[number];

export const CATALOGUE_ENTITY_LIFECYCLE_STATES = ["active", "archived", "merged"] as const;
export type CatalogueEntityLifecycleState = (typeof CATALOGUE_ENTITY_LIFECYCLE_STATES)[number];

export type CatalogueEntity = {
  id: string;
  workspaceId: string;
  kind: CatalogueEntityKind;
  name: string;
  normalizedName: string;
  lifecycleState: CatalogueEntityLifecycleState;
  revision: number;
  archivedAt: string | null;
  archivedBy: string | null;
  mergedIntoId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogueReferenceRewriteCounts = {
  costLibraryItems: number;
  priceOptions: number;
  estimateRows: number;
  templateRows: number;
  drafts: number;
};

export type CatalogueGovernanceMutationResult = {
  entity: CatalogueEntity;
  replayed: boolean;
  reusedExisting?: boolean;
  mergedEntity?: CatalogueEntity;
  rewrittenCounts?: CatalogueReferenceRewriteCounts;
  affectedEstimates?: Array<{ projectId: string; estimateId: string }>;
};

type CatalogueGovernanceCommandBase = {
  entityKind: CatalogueEntityKind;
  intentId: string;
};

export type CreateCatalogueEntityCommand = CatalogueGovernanceCommandBase & {
  kind: "create";
  name: string;
};

export type RenameCatalogueEntityCommand = CatalogueGovernanceCommandBase & {
  kind: "rename";
  entityId: string;
  expectedRevision: number;
  name: string;
};

export type ArchiveCatalogueEntityCommand = CatalogueGovernanceCommandBase & {
  kind: "archive";
  entityId: string;
  expectedRevision: number;
};

export type RestoreCatalogueEntityCommand = CatalogueGovernanceCommandBase & {
  kind: "restore";
  entityId: string;
  expectedRevision: number;
};

export type MergeCatalogueEntitiesCommand = CatalogueGovernanceCommandBase & {
  kind: "merge";
  survivorId: string;
  duplicateId: string;
  expectedSurvivorRevision: number;
  expectedDuplicateRevision: number;
};

export type CatalogueGovernanceCommand =
  | CreateCatalogueEntityCommand
  | RenameCatalogueEntityCommand
  | ArchiveCatalogueEntityCommand
  | RestoreCatalogueEntityCommand
  | MergeCatalogueEntitiesCommand;

export type CatalogueGovernanceErrorCode =
  | "catalogue_governance_admin_required"
  | "catalogue_governance_archived_duplicate"
  | "catalogue_governance_conflict"
  | "catalogue_governance_denied"
  | "catalogue_governance_invalid_input"
  | "catalogue_governance_not_found"
  | "catalogue_governance_stale_revision";

export class CatalogueGovernanceError extends Error {
  constructor(
    readonly code: CatalogueGovernanceErrorCode,
    message: string,
    readonly entity?: CatalogueEntity,
  ) {
    super(message);
    this.name = "CatalogueGovernanceError";
  }
}

const MAX_CATALOGUE_NAME_LENGTH = 160;
const MAX_INTENT_ID_LENGTH = 128;
const MAX_ENTITY_ID_LENGTH = 256;

function isCollapsibleAsciiWhitespace(character: string) {
  const code = character.codePointAt(0);
  return code === 32 || (code !== undefined && code >= 9 && code <= 13);
}

function collapseCatalogueWhitespace(value: string, lowercaseAscii: boolean) {
  let output = "";
  let pendingSpace = false;
  for (const character of value) {
    if (isCollapsibleAsciiWhitespace(character)) {
      pendingSpace = output.length > 0;
      continue;
    }
    if (pendingSpace) output += " ";
    pendingSpace = false;
    const code = character.codePointAt(0);
    output += lowercaseAscii && code !== undefined && code >= 65 && code <= 90
      ? String.fromCodePoint(code + 32)
      : character;
  }
  return output;
}

/** Must remain byte-identical to migration 0126's recursive SQLite normalization. */
export function normalizeCatalogueDisplayName(value: string) {
  return collapseCatalogueWhitespace(value, false);
}

/** Must remain byte-identical to migration 0126's recursive SQLite normalization. */
export function normalizeCatalogueName(value: string) {
  return collapseCatalogueWhitespace(value, true);
}

export function readCatalogueName(value: unknown) {
  if (typeof value !== "string") {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue name is required.");
  }
  const name = normalizeCatalogueDisplayName(value);
  if (!name) {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue name is required.");
  }
  if (name.length > MAX_CATALOGUE_NAME_LENGTH) {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue name is too long.");
  }
  return { name, normalizedName: normalizeCatalogueName(value) };
}

export function readCatalogueIntentId(value: unknown) {
  if (typeof value !== "string") {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue action intent is required.");
  }
  const intentId = value.trim();
  if (!intentId || intentId.length > MAX_INTENT_ID_LENGTH) {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue action intent is invalid.");
  }
  return intentId;
}

export function readCatalogueEntityId(value: unknown) {
  if (typeof value !== "string") {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue entity is required.");
  }
  const entityId = value.trim();
  if (!entityId || entityId.length > MAX_ENTITY_ID_LENGTH) {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue entity is invalid.");
  }
  return entityId;
}

export function readCatalogueRevision(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new CatalogueGovernanceError("catalogue_governance_invalid_input", "Catalogue revision is invalid.");
  }
  return Number(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseReceiptEntity(value: unknown): CatalogueEntity {
  if (!isRecord(value)) throw new Error("The committed catalogue mutation receipt is invalid.");
  if (
    typeof value.id !== "string"
    || typeof value.workspaceId !== "string"
    || !CATALOGUE_ENTITY_KINDS.includes(value.kind as CatalogueEntityKind)
    || typeof value.name !== "string"
    || typeof value.normalizedName !== "string"
    || !CATALOGUE_ENTITY_LIFECYCLE_STATES.includes(value.lifecycleState as CatalogueEntityLifecycleState)
    || typeof value.revision !== "number"
    || !Number.isSafeInteger(value.revision)
    || value.revision < 1
    || (value.archivedAt !== null && typeof value.archivedAt !== "string")
    || (value.archivedBy !== null && typeof value.archivedBy !== "string")
    || (value.mergedIntoId !== null && typeof value.mergedIntoId !== "string")
    || (value.createdBy !== null && typeof value.createdBy !== "string")
    || (value.updatedBy !== null && typeof value.updatedBy !== "string")
    || typeof value.createdAt !== "string"
    || typeof value.updatedAt !== "string"
  ) {
    throw new Error("The committed catalogue mutation receipt is invalid.");
  }
  return value as unknown as CatalogueEntity;
}

function parseRewriteCounts(value: unknown): CatalogueReferenceRewriteCounts | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("The committed catalogue mutation receipt is invalid.");
  const keys = ["costLibraryItems", "priceOptions", "estimateRows", "templateRows", "drafts"] as const;
  for (const key of keys) {
    const entry = value[key];
    if (typeof entry !== "number" || !Number.isSafeInteger(entry) || entry < 0) {
      throw new Error("The committed catalogue mutation receipt is invalid.");
    }
  }
  return value as unknown as CatalogueReferenceRewriteCounts;
}

function parseAffectedEstimates(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("The committed catalogue mutation receipt is invalid.");
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.projectId !== "string" || typeof entry.estimateId !== "string") {
      throw new Error("The committed catalogue mutation receipt is invalid.");
    }
    return { projectId: entry.projectId, estimateId: entry.estimateId };
  });
}

export function parseCatalogueMutationReceipt(value: unknown): Omit<CatalogueGovernanceMutationResult, "replayed"> {
  if (!isRecord(value)) throw new Error("The committed catalogue mutation receipt is invalid.");
  if (value.reusedExisting !== undefined && typeof value.reusedExisting !== "boolean") {
    throw new Error("The committed catalogue mutation receipt is invalid.");
  }
  return {
    entity: parseReceiptEntity(value.entity),
    ...(value.reusedExisting === undefined ? {} : { reusedExisting: value.reusedExisting }),
    ...(value.mergedEntity === undefined ? {} : { mergedEntity: parseReceiptEntity(value.mergedEntity) }),
    ...(value.rewrittenCounts === undefined ? {} : { rewrittenCounts: parseRewriteCounts(value.rewrittenCounts) }),
    ...(value.affectedEstimates === undefined ? {} : { affectedEstimates: parseAffectedEstimates(value.affectedEstimates) }),
  };
}
