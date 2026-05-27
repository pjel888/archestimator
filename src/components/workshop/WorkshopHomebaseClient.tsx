"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Blueprint, Books, Calculator, Folder, Star } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { signOutForPendingInvite } from "@/lib/collaboration/pending-invite-actions";
import { setEstimateFavorite, setProjectFavorite } from "@/lib/workshop/actions";
import type { WorkshopInviteBannerState } from "@/lib/collaboration/workshop-pending-invite";
import type { WorkshopEstimateSummary, WorkshopHomebaseData, WorkshopProjectSummary } from "@/lib/repositories/workspace-repository";
import { WorkshopTreeTabs, type WorkshopTreeTabItem } from "./workshop-tree";

type WorkshopDestination = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: typeof Folder;
  imageSrc: string;
  imageClassName: string;
};

type WorkshopHomebaseClientProps = {
  homebase: WorkshopHomebaseData;
  inviteBanner?: WorkshopInviteBannerState;
};

type FavoriteTab = "projects" | "estimates";

const favoriteTabs: readonly WorkshopTreeTabItem<FavoriteTab>[] = [
  { id: "projects", label: "Projects" },
  { id: "estimates", label: "Estimate Sheets" },
];

const destinations: WorkshopDestination[] = [
  {
    id: "projects",
    title: "Projects",
    description: "Create project shells, open estimate sheets, and project-level charts.",
    href: "/workshop/projects",
    actionLabel: "Open Projects",
    icon: Folder,
    imageSrc: "/Cards/Projects-Card.jpg",
    imageClassName:
      "bg-[radial-gradient(circle_at_24%_20%,rgba(213,186,87,0.70),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(204,106,51,0.70),transparent_38%),radial-gradient(circle_at_50%_78%,rgba(145,66,36,0.66),transparent_42%),linear-gradient(135deg,#c5a031_0%,#bb702f_45%,#934925_72%,#3e1f15_100%)]",
  },
  {
    id: "library",
    title: "Components",
    description: "Maintain priced components, variants, suppliers, and reusable line-items.",
    href: "/workshop/library",
    actionLabel: "Open Components",
    icon: Books,
    imageSrc: "/Cards/Components-Card.jpg",
    imageClassName:
      "bg-[radial-gradient(ellipse_at_8%_52%,rgba(218,214,187,0.30),transparent_27%),radial-gradient(circle_at_74%_24%,rgba(130,153,88,0.22),transparent_24%),radial-gradient(circle_at_66%_56%,rgba(0,105,72,0.58),transparent_34%),radial-gradient(circle_at_30%_15%,rgba(74,130,122,0.46),transparent_36%),linear-gradient(135deg,#6d8f81_0%,#106c57_42%,#023f34_72%,#061d1b_100%)]",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Reuse estimate groups, areas, and row structures without rebuilding.",
    href: "/workshop/templates",
    actionLabel: "Open Templates",
    icon: Blueprint,
    imageSrc: "/Cards/Templates-Card.jpg",
    imageClassName:
      "bg-[radial-gradient(circle_at_62%_28%,rgba(111,149,182,0.46),transparent_28%),radial-gradient(circle_at_26%_30%,rgba(59,104,153,0.46),transparent_34%),radial-gradient(circle_at_52%_78%,rgba(31,47,76,0.72),transparent_36%),linear-gradient(135deg,#456f9a_0%,#385b86_50%,#1a263f_100%)]",
  },
];

export function WorkshopHomebaseClient({ homebase, inviteBanner }: WorkshopHomebaseClientProps) {
  const router = useRouter();
  const [projectFavoriteOverrides, setProjectFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [estimateFavoriteOverrides, setEstimateFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [activeFavoriteTab, setActiveFavoriteTab] = useState<FavoriteTab>("projects");
  const [pendingFavoriteKey, setPendingFavoriteKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const projects = useMemo(
    () => applyFavoriteOverrides(homebase.projects, projectFavoriteOverrides),
    [homebase.projects, projectFavoriteOverrides],
  );
  const estimates = useMemo(
    () => applyFavoriteOverrides(homebase.estimates, estimateFavoriteOverrides),
    [estimateFavoriteOverrides, homebase.estimates],
  );
  const favoriteProjects = projects.filter((project) => project.isFavorite);
  const favoriteEstimates = estimates.filter((estimate) => estimate.isFavorite);

  function toggleProject(projectId: string, nextFavorite: boolean) {
    const previousFavorite = projects.find((project) => project.id === projectId)?.isFavorite ?? false;
    setProjectFavoriteOverrides((current) => ({ ...current, [projectId]: nextFavorite }));
    setPendingFavoriteKey(`project:${projectId}`);
    startTransition(() => {
      void setProjectFavorite({ projectId, favorite: nextFavorite })
        .then(() => router.refresh())
        .catch(() => setProjectFavoriteOverrides((current) => ({ ...current, [projectId]: previousFavorite })))
        .finally(() => setPendingFavoriteKey(null));
    });
  }

  function toggleEstimate(estimateId: string, nextFavorite: boolean) {
    const previousFavorite = estimates.find((estimate) => estimate.id === estimateId)?.isFavorite ?? false;
    setEstimateFavoriteOverrides((current) => ({ ...current, [estimateId]: nextFavorite }));
    setPendingFavoriteKey(`estimate:${estimateId}`);
    startTransition(() => {
      void setEstimateFavorite({ estimateId, favorite: nextFavorite })
        .then(() => router.refresh())
        .catch(() => setEstimateFavoriteOverrides((current) => ({ ...current, [estimateId]: previousFavorite })))
        .finally(() => setPendingFavoriteKey(null));
    });
  }

  return (
    <div className="h-full min-h-0 bg-white p-2">
      <section
        className="grid h-full min-h-0 grid-cols-12 auto-rows-min content-start gap-2 overflow-y-auto text-[10px] xl:grid-rows-[auto_minmax(0,1fr)] xl:content-stretch xl:overflow-hidden"
        aria-label="Workshop bento"
      >
        <InviteResolutionBanner inviteBanner={inviteBanner} />

        <BentoPanel className="col-span-12 xl:col-span-8 xl:row-start-1" label="Start here" title="Workshop routes" showHeader={false} surface="flush">
          <div className="grid content-start items-start gap-2 md:grid-cols-3">
            {destinations.map((destination) => (
              <DestinationTile key={destination.id} destination={destination} />
            ))}
          </div>
        </BentoPanel>

        <FavoritesPanel
          activeTab={activeFavoriteTab}
          favoriteProjects={favoriteProjects}
          favoriteEstimates={favoriteEstimates}
          pendingFavoriteKey={pendingFavoriteKey}
          onTabChange={setActiveFavoriteTab}
          onToggleProjectFavorite={toggleProject}
          onToggleEstimateFavorite={toggleEstimate}
        />
      </section>
    </div>
  );
}

function InviteResolutionBanner({
  inviteBanner,
}: {
  inviteBanner?: WorkshopInviteBannerState;
}) {
  if (!inviteBanner || inviteBanner.kind === "none") return null;

  if (inviteBanner.kind === "accepted") {
    const title = inviteBanner.scope === "estimate" ? "Sheet shared" : "Project added";
    return (
      <section
        className="col-span-12 flex min-h-10 items-center justify-between gap-3 border border-hairline bg-surfaceMuted px-3 py-2"
        aria-label={title}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-4 text-ink">{title}</p>
          <p className="truncate text-[9px] leading-4 text-tertiary">The shared workspace is ready.</p>
        </div>
        <Link href={inviteBanner.targetHref} className="shrink-0 text-[10px] font-medium leading-none text-ink underline">
          {inviteBanner.targetLabel}
        </Link>
      </section>
    );
  }

  if (inviteBanner.kind === "wrong-account") {
    const invitedEmail = inviteBanner.invitedEmail ?? "the invited email";
    return (
      <section
        className="col-span-12 flex min-h-10 items-center justify-between gap-3 border border-hairline bg-surfaceMuted px-3 py-2"
        aria-label="Invite unavailable"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-4 text-ink">Invite not applied</p>
          <p className="text-[9px] leading-4 text-tertiary">
            Sign out and continue with {invitedEmail} to accept this invite.
          </p>
        </div>
        <form action={signOutForPendingInvite}>
          <Button type="submit" variant="secondary" size="sm" className="min-h-7 shrink-0 rounded-xs px-2 text-[10px]">
            Sign out and continue
          </Button>
        </form>
      </section>
    );
  }

  const message = inviteBanner.reason === "expired"
    ? "That invite expired. Ask the sender for a new link."
    : "That invite is no longer available.";

  return (
    <section
      className="col-span-12 min-h-10 border border-hairline bg-surfaceMuted px-3 py-2"
      aria-label="Invite unavailable"
    >
      <p className="text-[11px] font-medium leading-4 text-ink">Invite not applied</p>
      <p className="text-[9px] leading-4 text-tertiary">{message}</p>
    </section>
  );
}

function applyFavoriteOverrides<T extends { id: string; isFavorite: boolean; favoriteCreatedAt: string | null }>(
  items: T[],
  overrides: Record<string, boolean>,
) {
  return items.map((item) => {
    const override = overrides[item.id];
    if (typeof override !== "boolean") return item;
    return {
      ...item,
      isFavorite: override,
      favoriteCreatedAt: override ? item.favoriteCreatedAt : null,
    };
  });
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function getEstimateHref(estimate: WorkshopEstimateSummary) {
  return estimate.firstNodeId
    ? `/workshop/projects/${estimate.project_id}/estimates/${estimate.firstNodeId}`
    : `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`;
}

function BentoPanel({
  className,
  label,
  title,
  showHeader = true,
  surface = "panel",
  children,
}: {
  className?: string;
  label: string;
  title: string;
  showHeader?: boolean;
  surface?: "panel" | "flush";
  children: React.ReactNode;
}) {
  const surfaceClass = surface === "flush" ? "border-0 bg-transparent p-0" : "border border-hairline bg-white p-2";

  return (
    <section
      className={`flex min-h-[132px] flex-col overflow-hidden xl:min-h-0 ${surfaceClass} ${className ?? ""}`}
      aria-label={title}
    >
      {showHeader ? (
        <div className="mb-2 flex min-h-5 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">{label}</p>
            <h2 className="truncate text-[12px] font-medium leading-4 text-ink">{title}</h2>
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function EmptyBentoMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[84px] flex-col justify-center border border-dashed border-hairline bg-surfaceMuted/30 p-2">
      <p className="text-[10px] font-medium leading-4 text-ink">{title}</p>
      <p className="text-[9px] leading-4 text-tertiary">{description}</p>
    </div>
  );
}

function FavoriteButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`grid size-6 shrink-0 place-items-center rounded-xs transition hover:bg-surfaceMuted hover:text-ink disabled:cursor-wait disabled:opacity-50 ${
        active ? "text-ink" : "text-tertiary"
      }`}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Star size={12} weight="regular" aria-hidden="true" />
    </button>
  );
}

function FavoritesPanel({
  activeTab,
  favoriteProjects,
  favoriteEstimates,
  pendingFavoriteKey,
  onTabChange,
  onToggleProjectFavorite,
  onToggleEstimateFavorite,
}: {
  activeTab: FavoriteTab;
  favoriteProjects: WorkshopProjectSummary[];
  favoriteEstimates: WorkshopEstimateSummary[];
  pendingFavoriteKey: string | null;
  onTabChange: (tab: FavoriteTab) => void;
  onToggleProjectFavorite: (projectId: string, favorite: boolean) => void;
  onToggleEstimateFavorite: (estimateId: string, favorite: boolean) => void;
}) {
  return (
    <section
      className="col-span-12 flex h-full min-h-[220px] flex-col overflow-hidden border border-hairline bg-white xl:col-span-4 xl:col-start-9 xl:row-span-2 xl:row-start-1 xl:min-h-0"
      aria-label="Favorites"
    >
      <div className="shrink-0 px-2 pb-1 pt-2">
        <h2 className="truncate text-[12px] font-medium leading-4 text-ink">Favorites</h2>
      </div>
      <div className="shrink-0">
        <WorkshopTreeTabs tabs={favoriteTabs} activeTab={activeTab} ariaLabel="Favorite views" onTabChange={onTabChange} />
      </div>
      <div
        role="tabpanel"
        aria-label={activeTab === "projects" ? "Favorite projects" : "Favorite estimate sheets"}
        className="min-h-0 flex-1 overflow-hidden p-2"
      >
        {activeTab === "projects" ? (
          <ProjectList
            projects={favoriteProjects}
            emptyTitle="No favorite projects yet"
            emptyDescription="Star a project below to keep it pinned here."
            pendingFavoriteKey={pendingFavoriteKey}
            onToggleFavorite={onToggleProjectFavorite}
          />
        ) : (
          <EstimateList
            estimates={favoriteEstimates}
            emptyTitle="No favorite estimate sheets yet"
            emptyDescription="Star a sheet below for direct access from Workshop."
            pendingFavoriteKey={pendingFavoriteKey}
            onToggleFavorite={onToggleEstimateFavorite}
          />
        )}
      </div>
    </section>
  );
}

function ProjectList({
  projects,
  emptyTitle,
  emptyDescription,
  pendingFavoriteKey,
  onToggleFavorite,
}: {
  projects: WorkshopProjectSummary[];
  emptyTitle: string;
  emptyDescription: string;
  pendingFavoriteKey: string | null;
  onToggleFavorite: (projectId: string, favorite: boolean) => void;
}) {
  if (projects.length === 0) {
    return <EmptyBentoMessage title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid max-h-full content-start gap-1.5 overflow-auto">
      {projects.map((project) => (
        <div key={project.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border border-hairline bg-surfaceMuted/20 p-2">
          <span className="grid size-7 place-items-center rounded-xs bg-white text-tertiary ring-1 ring-hairline">
            <Folder size={13} weight="regular" aria-hidden="true" />
          </span>
          <Link href={`/workshop/projects/${project.id}`} className="min-w-0 hover:text-secondary">
            <span className="block truncate text-[11px] font-medium leading-4 text-ink">{project.name}</span>
            <span className="block truncate text-[9px] leading-4 text-tertiary">
              {project.project_code ?? "No project code"} · {project.client_name ?? "No client"} · Updated {formatUpdatedAt(project.updated_at)}
            </span>
          </Link>
          <FavoriteButton
            active={project.isFavorite}
            disabled={pendingFavoriteKey === `project:${project.id}`}
            label={project.isFavorite ? `Remove ${project.name} from favorite projects` : `Add ${project.name} to favorite projects`}
            onClick={() => onToggleFavorite(project.id, !project.isFavorite)}
          />
        </div>
      ))}
    </div>
  );
}

function EstimateList({
  estimates,
  emptyTitle,
  emptyDescription,
  pendingFavoriteKey,
  onToggleFavorite,
}: {
  estimates: WorkshopEstimateSummary[];
  emptyTitle: string;
  emptyDescription: string;
  pendingFavoriteKey: string | null;
  onToggleFavorite: (estimateId: string, favorite: boolean) => void;
}) {
  if (estimates.length === 0) {
    return <EmptyBentoMessage title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid max-h-full content-start gap-1.5 overflow-auto">
      {estimates.map((estimate) => (
        <div key={estimate.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border border-hairline bg-surfaceMuted/20 p-2">
          <span className="grid size-7 place-items-center rounded-xs bg-white text-tertiary ring-1 ring-hairline">
            <Calculator size={13} weight="regular" aria-hidden="true" />
          </span>
          <Link href={getEstimateHref(estimate)} className="min-w-0 hover:text-secondary">
            <span className="block truncate text-[11px] font-medium leading-4 text-ink">{estimate.name}</span>
            <span className="block truncate text-[9px] leading-4 text-tertiary">
              {estimate.sheet_code} · {estimate.projectName} · Updated {formatUpdatedAt(estimate.updated_at)}
            </span>
          </Link>
          <FavoriteButton
            active={estimate.isFavorite}
            disabled={pendingFavoriteKey === `estimate:${estimate.id}`}
            label={estimate.isFavorite ? `Remove ${estimate.name} from favorite estimate sheets` : `Add ${estimate.name} to favorite estimate sheets`}
            onClick={() => onToggleFavorite(estimate.id, !estimate.isFavorite)}
          />
        </div>
      ))}
    </div>
  );
}

function DestinationTile({
  destination,
}: {
  destination: WorkshopDestination;
}) {
  const Icon = destination.icon;

  return (
    <Link
      href={destination.href}
      className={`group relative block aspect-square w-full min-h-[210px] overflow-hidden rounded-xs border border-hairline text-white shadow-[0_18px_46px_-38px_rgba(17,17,17,0.85)] outline-none transition ${destination.imageClassName}`}
      aria-label={`${destination.actionLabel}: ${destination.description}`}
    >
      <Image
        src={destination.imageSrc}
        alt=""
        fill
        sizes="(min-width: 1280px) 21vw, (min-width: 768px) 33vw, 100vw"
        className="object-cover opacity-[0.17] mix-blend-soft-light saturate-[0.82] contrast-[0.98]"
        aria-hidden="true"
      />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0.06)_0%,rgba(18,18,18,0.28)_48%,rgba(18,18,18,0.76)_100%)]" aria-hidden="true" />
      <span className="absolute inset-0 opacity-[0.20] mix-blend-soft-light bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.38)_1px,transparent_1px)] bg-[length:4px_4px]" aria-hidden="true" />
      <span className="absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-xs bg-white/[0.10] text-white/88 ring-1 ring-white/16 backdrop-blur-[1px]" aria-hidden="true">
        <Icon size={16} weight="regular" />
      </span>
      <span className="absolute inset-x-3 bottom-3 z-10 flex min-w-0 flex-col">
        <span className="block truncate text-[12px] font-medium leading-4 text-white">{destination.title}</span>
        <span className="mt-2 block h-12 max-w-[34ch] text-[10px] leading-4 text-white/84">{destination.description}</span>
        <span className="mt-3 inline-flex w-full items-center justify-end gap-1 text-right text-[10px] font-medium leading-none text-white/94">
          {destination.actionLabel}
          <ArrowRight size={11} weight="regular" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
