"use client";

import { useEffect, useId } from "react";

import { Button } from "@/components/ui/button";
import { buildClientErrorPayload, postClientErrorReport } from "@/lib/observability/client-error-report";

type WorkshopRouteErrorStateProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  routeLabel: string;
  unstable_retry?: () => void;
};

export function WorkshopRouteErrorState({ error, reset, routeLabel, unstable_retry }: WorkshopRouteErrorStateProps) {
  const retryButtonId = useId();
  const retry = unstable_retry ?? reset ?? (() => undefined);

  useEffect(() => {
    document.getElementById(retryButtonId)?.focus();
  }, [retryButtonId]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Workshop route error", {
        route: routeLabel,
        name: error.name,
        digest: error.digest ?? null,
      });
    }
  }, [error, routeLabel]);

  useEffect(() => {
    void postClientErrorReport(
      buildClientErrorPayload(error, {
        route: routeLabel,
        source: "workshop-route-error",
      }),
    ).catch(() => undefined);
  }, [error, routeLabel]);

  return (
    <section className="flex h-full min-h-[320px] items-center justify-center bg-white p-2 text-ink" role="alert">
      <div className="w-full max-w-[360px] rounded-xs border border-hairline bg-white p-3 shadow-[0_18px_42px_-38px_rgba(17,17,17,0.55)]">
        <p className="text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary">
          {routeLabel}
        </p>
        <h1 className="mt-1 text-[12px] font-medium leading-4 tracking-normal text-ink">
          This view could not load
        </h1>
        <p className="mt-1 text-[10px] font-normal leading-4 tracking-normal text-tertiary">
          Refresh this section and continue from the current workspace.
        </p>
        <Button id={retryButtonId} type="button" variant="secondary" size="md" className="mt-3 h-8 w-full rounded-xs" onClick={retry}>
          Retry
        </Button>
      </div>
    </section>
  );
}
