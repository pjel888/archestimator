import type { ProjectPublicationSummary } from "./types";

type PublicationRevisionStaleness = NonNullable<ProjectPublicationSummary["staleSnapshotWarning"]>;

function readNonnegativeInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function readPublicationRevisionStaleness({
  currentSourceRevision,
  snapshot,
}: {
  currentSourceRevision: unknown;
  snapshot: unknown;
}): PublicationRevisionStaleness | null | undefined {
  const current = readNonnegativeInteger(currentSourceRevision);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return undefined;
  const issued = readNonnegativeInteger((snapshot as { sourceRevision?: unknown }).sourceRevision);
  if (current === null || issued === null) return undefined;
  if (current <= issued) return null;
  return {
    currentSourceRevision: current,
    issuedSourceRevision: issued,
  };
}
