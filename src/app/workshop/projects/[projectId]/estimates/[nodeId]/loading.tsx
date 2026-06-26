import { EstimateSheetRouteSkeleton } from "@/components/workshop/EstimateSheetRouteSkeleton";

// Mirrors the live three-pane estimate shell to avoid the
// parent estimate-list skeleton flashing during sheet route transitions.
export default function Loading() {
  return <EstimateSheetRouteSkeleton />;
}
