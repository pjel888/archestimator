"use client";

import { WorkshopRouteErrorState } from "@/components/workshop/WorkshopRouteErrorState";

export default function Error({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  return <WorkshopRouteErrorState error={error} reset={reset} unstable_retry={unstable_retry} routeLabel="Share" />;
}
