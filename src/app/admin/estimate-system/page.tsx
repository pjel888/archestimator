import { EstimateSystemMap } from "@/components/admin/estimate-system-map/EstimateSystemMap";
import { estimateSystemDocumentation } from "@/lib/admin/estimate-system-map-data";

export default function AdminEstimateSystemPage() {
  return <EstimateSystemMap documentation={estimateSystemDocumentation} />;
}
