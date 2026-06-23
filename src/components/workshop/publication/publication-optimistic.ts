import type { ProjectPublicationSummary } from "@/lib/publication/types";

/**
 * Server "signature" of the publication summary at a moment in time. The
 * optimistic `localResult` is only honored while the live summary still carries
 * the signature captured when the optimistic result was created.
 */
export function readPublicationServerSignature(summary: ProjectPublicationSummary | null): string {
  if (!summary) return "none";
  return [
    summary.status ?? "unpublished",
    summary.clientLinkPath ?? "",
    summary.snapshotVersion ?? 0,
    summary.passwordRequired ?? false,
  ].join("|");
}

export function shouldUseOptimisticPublicationResult(
  localResult: { summaryKey: string; baseServerSignature: string } | null,
  summaryKey: string,
  serverSignature: string,
): boolean {
  return Boolean(
    localResult &&
      localResult.summaryKey === summaryKey &&
      // react-doctor-disable-next-line react-doctor/insecure-crypto-risk -- This is a UI staleness signature, not cryptographic proof or authorization.
      localResult.baseServerSignature === serverSignature,
  );
}
