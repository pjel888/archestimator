"use client";

import nextDynamic from "next/dynamic";
import type { LocalDatabase } from "@/lib/local-data/schemas";

const EstimateGridSpike = nextDynamic(() => import("@/components/estimate-grid-spike").then((module) => module.EstimateGridSpike), {
  ssr: false,
  loading: () => <div className="rounded-3xl border border-hairline bg-surface p-2 text-sm text-muted">Loading grid spike…</div>,
});

export function EstimateGridSpikeLoader({ database, projectId }: { database: LocalDatabase; projectId: string }) {
  return <EstimateGridSpike database={database} projectId={projectId} />;
}
