import Link from "next/link";
import { ArrowRight, ArrowsOutSimple, Clock, ImageSquare, MapPin } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import type { Json, Tables } from "@/lib/supabase/types";

type LiveProjectCardProps = {
  project: Tables<"projects">;
  onExpand?: (project: Tables<"projects">) => void;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function getProjectImageUrl(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, Json>).projectImageUrl;
  return typeof value === "string" && value.trim() ? value : null;
}

export function LiveProjectCard({ project, onExpand }: LiveProjectCardProps) {
  const imageUrl = getProjectImageUrl(project.metadata);

  return (
    <article className="group flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-hairline bg-white shadow-[0_16px_38px_-34px_rgba(17,17,17,0.5)] transition duration-150 hover:-translate-y-0.5 hover:border-divider hover:shadow-[0_24px_52px_-38px_rgba(17,17,17,0.58)]">
      <div className="relative h-32 overflow-hidden border-b border-hairline bg-surfaceMuted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#fff0e5_0%,#f4f7fa_55%,#ffffff_100%)] text-tertiary">
            <ImageSquare size={24} weight="duotone" aria-hidden="true" />
            <span className="text-[8px] font-bold uppercase tracking-[0.12em]">Add project image</span>
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="absolute right-2 top-2 size-7 border-white/70 bg-white/86 text-ink shadow-sm backdrop-blur hover:bg-white"
          aria-label={`Expand ${project.name} details`}
          onClick={() => onExpand?.(project)}
        >
          <ArrowsOutSimple size={13} weight="bold" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col p-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-tertiary">{project.client_name ?? "No client yet"}</p>
          <h2 className="mt-1 line-clamp-2 text-[12px] font-bold leading-[1.12] tracking-[-0.02em] text-ink">
            {project.name}
          </h2>
        </div>

        <div className="mt-2 space-y-1">
          <p className="flex items-center gap-1.5 text-[10px] text-tertiary">
            <MapPin size={12} aria-hidden="true" />
            <span className="truncate">{project.location ?? "No location"}</span>
          </p>
          <p className="flex items-center gap-1.5 text-[10px] text-tertiary">
            <Clock size={12} aria-hidden="true" />
            Updated {formatUpdatedAt(project.updated_at)}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-hairline pt-2">
          <span className="truncate font-mono text-[10px] font-medium text-tertiary">{project.project_code ?? "—"}</span>
          <Link
            href={`/workshop/projects/${project.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-sm px-1.5 text-[10px] font-bold text-ink hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Open
            <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
