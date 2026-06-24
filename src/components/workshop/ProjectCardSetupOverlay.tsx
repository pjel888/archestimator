"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/ui/cn";

type ProjectCardSetupOverlayProps = {
  setupStatus:
    | {
        state: "creating" | "preparing" | "error";
        message: string;
      }
    | null
    | undefined;
  setupBusy: boolean;
};

export function ProjectCardSetupOverlay({
  setupStatus,
  setupBusy,
}: ProjectCardSetupOverlayProps) {
  if (!setupStatus) return null;

  const isError = setupStatus.state === "error";

  return (
    <div
      data-project-card-setup-overlay=""
      className={cn(
        "pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/72 p-3 backdrop-blur-[2px]",
        isError ? "bg-white/82" : null,
      )}
    >
      <div
        role={isError ? "alert" : "status"}
        aria-live="polite"
        className={cn(
          "flex max-w-full items-center gap-2 rounded-xs border bg-white/95 px-2.5 py-2 text-[10px] font-medium leading-3 shadow-sm",
          isError ? "border-danger/30 text-danger" : "border-hairline text-ink",
        )}
      >
        {setupBusy ? (
          <Spinner size="xs" decorative className="shrink-0" />
        ) : (
          <span className="size-2 shrink-0 rounded-full bg-danger" aria-hidden="true" />
        )}
        <span className="min-w-0 text-balance">{setupStatus.message}</span>
      </div>
    </div>
  );
}
