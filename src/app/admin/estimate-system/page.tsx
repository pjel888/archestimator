import dynamic from "next/dynamic";

import { estimateSystemDocumentation } from "@/lib/admin/estimate-system-map-data";

const EstimateSystemMap = dynamic(
  () =>
    import("@/components/admin/estimate-system-map/EstimateSystemMap").then(
      (module) => module.EstimateSystemMap,
    ),
  {
    loading: () => (
      <div className="space-y-3" aria-busy="true" aria-label="Loading estimate system guide">
        <div className="h-5 w-48 animate-pulse rounded-xs bg-surfaceMuted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded-xs bg-surfaceMuted" />
        <div className="h-10 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/50" />
        <div className="h-72 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/40" />
      </div>
    ),
  },
);

export default function AdminEstimateSystemPage() {
  return <EstimateSystemMap documentation={estimateSystemDocumentation} />;
}
