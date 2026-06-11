"use client";

import { WorkshopRouteErrorState } from "@/components/workshop/WorkshopRouteErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <WorkshopRouteErrorState error={error} reset={reset} routeLabel="Templates" />;
}
