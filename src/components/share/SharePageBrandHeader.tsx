import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

type SharePageBrandHeaderProps = {
  project: ProjectPublicationSnapshot["project"];
};

function monogram(value: string | null | undefined, fallback: string) {
  const letters = String(value ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || fallback;
}

function BrandSlot({
  align,
  fallback,
  label,
  name,
}: {
  align: "left" | "right";
  fallback: string;
  label: string;
  name: string | null | undefined;
}) {
  const direction = align === "right" ? "flex-row-reverse" : "flex-row";

  return (
    <div className={`flex min-w-0 items-center gap-2 ${direction}`}>
      <span
        aria-label={name ? `${name} logo placeholder` : `${label} logo placeholder`}
        className="grid size-8 shrink-0 place-items-center border border-hairline bg-surfaceMuted text-[9px] font-medium leading-none text-secondary"
        role="img"
      >
        {monogram(name, fallback)}
      </span>
      <span className="text-[9px] font-medium leading-[12px] text-tertiary">{label}</span>
    </div>
  );
}

/** Reserves all three identity positions when either partner logo is unavailable. */
export function SharePageBrandHeader({ project }: SharePageBrandHeaderProps) {
  const showArchestimatorBranding = project.showArchestimatorBranding !== false;

  return (
    <header className="share-print-hidden sticky top-0 z-30 border-b border-hairline bg-white/95 backdrop-blur" data-share-brand-header>
      <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_8.75rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)] sm:gap-4">
        <BrandSlot align="left" fallback="PB" label="Proposal team" name={project.senderName} />
        <div className="flex h-8 items-center justify-center" data-share-platform-slot>
          {showArchestimatorBranding ? (
            <ArchestimatorLogo
              markSize={20}
              className="gap-1.5 text-ink"
              separatorClassName="h-4"
              wordmarkClassName="text-[11px] leading-none"
            />
          ) : (
            <span aria-hidden="true" className="h-8 w-full" />
          )}
        </div>
        <BrandSlot align="right" fallback="CL" label="Client" name={project.clientName} />
      </div>
    </header>
  );
}
