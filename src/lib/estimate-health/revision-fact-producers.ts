const REQUIRED_ESTIMATE_REVISION_FACT_PRODUCERS = [
  "row-insert",
  "row-update",
  "row-replace",
  "row-move",
  "row-delete",
  "row-restore",
  "sheet-adjustment",
  "template-copy",
  "subtree-copy",
  "ai-package-mutation",
] as const;

export function validateEstimateRevisionFactProducerRegistry(producers: readonly string[]) {
  const producerCounts = new Map<string, number>();
  for (const producer of producers) {
    producerCounts.set(producer, (producerCounts.get(producer) ?? 0) + 1);
  }
  const required = new Set<string>(REQUIRED_ESTIMATE_REVISION_FACT_PRODUCERS);
  const missing = REQUIRED_ESTIMATE_REVISION_FACT_PRODUCERS.filter((producer) => !producerCounts.has(producer));
  const unknown = [...producerCounts.keys()].filter((producer) => !required.has(producer)).sort();
  const duplicates = [...producerCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([producer]) => producer)
    .sort();
  if (missing.length === 0 && unknown.length === 0 && duplicates.length === 0) return { ok: true as const };
  return { ok: false as const, missing, unknown, duplicates };
}
