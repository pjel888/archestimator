"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowsOutSimple,
  Clock,
  LinkSimple,
  MapPin,
  Star,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { acceptPendingInvitationById } from "@/lib/collaboration/pending-invite-actions";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import type { Json, Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";
import type { CollaborationRole } from "@/lib/collaboration/types";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type {
  ProjectFavoriteEstimateSheetSummary,
  WorkshopPendingInviteSummary,
} from "@/lib/repositories/workspace-repository";

export type ProjectCardViewMode = "list" | "small" | "medium" | "large";
export type ProjectAccessKind = "owned" | "pending-invite" | "project-member" | "sheet-member";

type LiveProjectCardProps = {
  project: Tables<"projects">;
  viewMode?: ProjectCardViewMode;
  accessKind?: ProjectAccessKind;
  currentUserRole?: CollaborationRole;
  ownerWorkspaceName?: string | null;
  pendingInvite?: WorkshopPendingInviteSummary | null;
  pendingInviteCount?: number;
  publicationSummary?: ProjectPublicationListSummary | null;
  sharedEstimateCount?: number;
  favoriteEstimateSheets?: ProjectFavoriteEstimateSheetSummary[];
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  selectedForDeletion?: boolean;
  selectionActive?: boolean;
  onToggleSelected?: (projectId: string) => void;
  onToggleFavorite?: (projectId: string, favorite: boolean) => void;
  onExpand?: (project: Tables<"projects">) => void;
};

// Action affordances rest hidden and reveal on hover or keyboard focus so the
// thumbnail reads as the project image first. While hidden they are
// pointer-events-none, so a click on the image corner falls through to the tile
// link instead of hitting an invisible button. They stay keyboard-focusable
// (Tab reveals them via focus-within). Touch devices (no hover) keep them visible.
const REVEAL_ON_INTENT =
  "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

const CONTROL_BUTTON = "size-6 border-hairline bg-white";
function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(value));
}

function getProjectImageUrl(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return null;
  const value = (metadata as Record<string, Json>).projectImageUrl;
  return typeof value === "string" && value.trim() ? value : null;
}

function getProjectMotif(project: Tables<"projects">) {
  // A quiet name monogram for image-absent tiles; the project code already lives
  // in the footer, so the thumbnail stays a distinct, non-duplicate identifier.
  const words = project.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return project.project_code?.trim() || "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const roleLabels: Record<CollaborationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function getAccessBadgeLabel(accessKind: ProjectAccessKind) {
  if (accessKind === "pending-invite") return "Pending invite";
  if (accessKind === "project-member") return "Shared project";
  if (accessKind === "sheet-member") return "Estimate-only";
  return "Owned";
}

function formatOpenCount(count: number) {
  return `${count} ${count === 1 ? "open" : "opens"}`;
}

function getAccessibleAccessLabel({
  accessKind,
  projectName,
  role,
}: {
  accessKind: ProjectAccessKind;
  projectName: string;
  role: CollaborationRole;
}) {
  if (accessKind === "owned") return `${projectName} project, owned access`;
  if (accessKind === "pending-invite") return `${projectName} project, pending invite, ${role} access`;
  if (accessKind === "sheet-member") return `${projectName} project, estimate-only access, ${role} access`;
  return `${projectName} project, shared project, ${role} access`;
}

export function LiveProjectCard({
  project,
  viewMode = "large",
  accessKind = "owned",
  currentUserRole = "owner",
  ownerWorkspaceName = null,
  pendingInvite = null,
  pendingInviteCount = 0,
  publicationSummary = null,
  sharedEstimateCount = 0,
  favoriteEstimateSheets = [],
  isFavorite = false,
  favoriteBusy = false,
  selectedForDeletion = false,
  selectionActive = false,
  onToggleSelected,
  onToggleFavorite,
  onExpand,
}: LiveProjectCardProps) {
  const imageUrl = getProjectImageUrl(project.metadata);
  const isListView = viewMode === "list";
  const isPendingInvite = accessKind === "pending-invite";
  const isExpiredPendingInvite = isPendingInvite && pendingInvite?.state === "expired";
  const isSharedAccess = accessKind !== "owned" && !isPendingInvite;
  const canToggleFavorite = Boolean(onToggleFavorite) && !isPendingInvite;
  const canShowSelect = !isPendingInvite;
  const canSelect = Boolean(onToggleSelected) && canShowSelect;
  const livePublication = publicationSummary?.status === "published" ? publicationSummary : null;
  const openLabel = accessKind === "sheet-member" && sharedEstimateCount === 1 ? "Open estimate" : "Open";
  const projectHref = `/workshop/projects/${project.id}`;
  const prefetchRoutes = useMemo(() => [{ pathname: projectHref }], [projectHref]);
  const { prefetch, cancel } = usePrefetchOnHover(prefetchRoutes);
  const motif = getProjectMotif(project);

  // Density ladder: "small" = compact tile (image + title + client); "medium" adds
  // one meta line + footer; "large" is the full showcase. Pending invites keep
  // their action in every mode.
  const hasInvites = accessKind === "owned" && pendingInviteCount > 0;
  const showMeta = !isListView && viewMode !== "small";
  const showSecondaryMeta = viewMode === "large";
  const showFooter = !isListView && viewMode !== "small";
  const visibleFavoriteEstimateSheets = favoriteEstimateSheets.slice(0, 5);

  const accessChip = isPendingInvite ? (
    <span key="access" className="inline-flex shrink-0 items-center rounded-xs bg-warningSoft px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-warning">
      {isExpiredPendingInvite ? "Invite expired" : getAccessBadgeLabel(accessKind)}
    </span>
  ) : isSharedAccess ? (
    <span key="access" className="inline-flex shrink-0 items-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-secondary">
      {getAccessBadgeLabel(accessKind)}
    </span>
  ) : null;

  const invitesChip = hasInvites ? (
    <span key="invites" className="inline-flex shrink-0 items-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-secondary">
      {pendingInviteCount} {pendingInviteCount === 1 ? "invite" : "invites"}
    </span>
  ) : null;

  const selectControl = canShowSelect ? (
    <label
      className={cn(
        "grid size-6 shrink-0 cursor-pointer place-items-center rounded-xs border border-hairline bg-white text-ink hover:bg-surfaceMuted",
        // When a selection is active the checkbox must stay clickable, so it drops
        // the reveal gate and re-asserts pointer-events over the wrapper's none.
        selectedForDeletion || selectionActive ? "opacity-100 pointer-events-auto" : REVEAL_ON_INTENT,
        !canSelect ? "cursor-not-allowed text-tertiary hover:bg-white" : null,
      )}
      title="Select project for deletion"
    >
      <span className="sr-only">{`Select ${project.name} for deletion`}</span>
      <input
        type="checkbox"
        className="size-3 rounded-xs border-hairline accent-danger"
        aria-label={`Select ${project.name} for deletion`}
        checked={selectedForDeletion}
        disabled={!canSelect}
        onChange={() => onToggleSelected?.(project.id)}
      />
    </label>
  ) : null;

  const favoriteControl = canToggleFavorite ? (
    <Button
      type="button"
      variant="secondary"
      size="icon-xs"
      className={cn(
        CONTROL_BUTTON,
        "cursor-pointer aria-busy:cursor-wait aria-disabled:opacity-60",
        // Favorited stays visible with a quiet pressed surface instead of a
        // louder accent color.
        isFavorite
          ? "pointer-events-auto opacity-100 aria-pressed:border-tertiary/40 aria-pressed:bg-surfaceMuted aria-pressed:text-ink"
          : cn("text-secondary hover:text-ink", favoriteBusy ? "opacity-100" : REVEAL_ON_INTENT),
      )}
      aria-label={
        isFavorite
          ? `Remove ${project.name} from favorite projects`
          : `Add ${project.name} to favorite projects`
      }
      aria-pressed={isFavorite}
      // Stay focusable while saving (native `disabled` would drop keyboard focus to
      // <body>); the click is guarded instead, and aria-busy announces the in-flight state.
      aria-busy={favoriteBusy}
      aria-disabled={favoriteBusy}
      onClick={() => {
        if (favoriteBusy) return;
        onToggleFavorite?.(project.id, !isFavorite);
      }}
    >
      <Star size={13} weight="regular" aria-hidden="true" />
    </Button>
  ) : null;

  const statusChips = [accessChip, invitesChip].filter(Boolean);

  function renderStatusSlot() {
    return (
      <div
        data-project-card-status-slot=""
        aria-label={statusChips.length > 0 ? "Project status" : "No project status"}
        className={cn(
          "flex h-[18px] min-w-0 flex-nowrap items-center gap-1 overflow-hidden",
          statusChips.length === 0 ? "items-start" : null,
        )}
      >
        {statusChips}
      </div>
    );
  }

  function renderOpenActivityRow() {
    return (
      <p
        data-project-card-shared-link-meta=""
        aria-label={`Shared link activity for ${project.name}`}
        className="flex items-center gap-1.5 text-[9px] leading-3 text-secondary"
      >
        <LinkSimple size={12} weight="regular" aria-hidden="true" className="shrink-0" />
        <span className="truncate">{livePublication ? formatOpenCount(livePublication.openCount) : "No opens"}</span>
      </p>
    );
  }

  function renderThumbnailReveal() {
    const maxVisible = viewMode === "small" ? 2 : viewMode === "medium" ? 3 : 5;
    const sheets = visibleFavoriteEstimateSheets.slice(0, maxVisible);
    const hiddenCount = visibleFavoriteEstimateSheets.length - sheets.length;
    const hasSheets = sheets.length > 0;

    return (
      <div
        data-project-card-hover-reveal=""
        aria-label={
          hasSheets
            ? `Hover details for ${project.name}`
            : `Hover controls for ${project.name}`
        }
        className={cn(
          "pointer-events-none absolute inset-0 z-10 flex flex-col overflow-hidden bg-white/90 opacity-0 shadow-sm transition-opacity duration-150 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 motion-reduce:transition-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100",
          viewMode === "large" ? "p-4" : "p-2",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="pointer-events-auto">{selectControl}</div>
          <div className="flex items-center gap-1">
            <div className="pointer-events-auto">{favoriteControl}</div>
            <div className="pointer-events-auto">{expandControl}</div>
          </div>
        </div>
        <div
          data-project-card-favorite-sheets=""
          aria-label={
            hasSheets
              ? `Favorite estimate sheets for ${project.name}`
              : `No favorite estimate sheets for ${project.name}`
          }
          className={cn("mt-2 min-h-0 min-w-0", hasSheets ? "block" : "hidden")}
        >
          {hasSheets ? (
            <>
              <div className="flex min-w-0 items-center gap-1 text-[8px] font-medium uppercase leading-[10px] text-secondary">
                <Star size={10} weight="regular" aria-hidden="true" className="shrink-0 text-warning" />
                <span className="truncate">Favorite sheets</span>
              </div>
              <div
                className={cn(
                  "mt-2 min-w-0 text-[9px] font-medium leading-3 text-ink",
                  viewMode === "large" ? "grid grid-cols-1 gap-1.5" : "space-y-1",
                )}
              >
                {sheets.map((sheet) => (
                  <div key={sheet.id} className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="block min-w-0 flex-1 truncate"
                      title={sheet.sheet_code ? `${sheet.name} (${sheet.sheet_code})` : sheet.name}
                    >
                      {sheet.name}
                    </span>
                    <ArrowsOutSimple size={10} weight="regular" aria-hidden="true" className="shrink-0 text-white" />
                  </div>
                ))}
                {hiddenCount > 0 ? (
                  <span className="block truncate text-tertiary">+{hiddenCount} more</span>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  function renderTitleBlock() {
    return (
      <>
        <p className="min-w-0 truncate text-[8px] font-medium uppercase tracking-normal text-secondary">
          {project.client_name ?? "No client yet"}
        </p>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h2
            className={cn(
              "min-w-0 font-medium tracking-normal text-ink [overflow-wrap:anywhere]",
              viewMode === "large" ? "line-clamp-2 min-h-[28px] text-[12px] leading-[1.18]" : null,
              viewMode === "medium" ? "line-clamp-2 min-h-[26px] text-[11px] leading-[1.18]" : null,
              viewMode === "small" ? "line-clamp-2 min-h-6 text-[10px] leading-[1.2]" : null,
            )}
          >
            {project.name}
          </h2>
          {livePublication ? (
            <span
              data-project-card-shared-link-indicator=""
              aria-label={`Shared link is active for ${project.name}`}
              className="mt-0.5 shrink-0 text-secondary"
              title="Shared link"
            >
              <LinkSimple size={13} weight="regular" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </>
    );
  }

  function renderTileMeta() {
    return (
      <div
        data-project-card-meta-stack=""
        className={cn("space-y-1", viewMode === "large" ? "mt-2.5 pb-3" : "mt-2 pb-2")}
      >
        {showSecondaryMeta ? renderOpenActivityRow() : null}
        {isSharedAccess || isPendingInvite ? (
          <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
            <span className="shrink-0 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-secondary">
              {roleLabels[currentUserRole]}
            </span>
            <span className="truncate">
              {isPendingInvite
                ? ownerWorkspaceName
                  ? `Invited by ${ownerWorkspaceName}`
                  : "Invited project"
                : accessKind === "sheet-member"
                  ? `${sharedEstimateCount} ${sharedEstimateCount === 1 ? "shared estimate" : "shared estimates"}`
                  : ownerWorkspaceName
                    ? `Shared by ${ownerWorkspaceName}`
                    : "Shared with you"}
            </span>
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-[9px] leading-3 text-secondary">
          <MapPin size={12} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{project.location ?? "No location"}</span>
        </p>
        {showSecondaryMeta || (isPendingInvite && pendingInvite?.expiresAt) ? (
          <p className="flex items-center gap-1.5 text-[9px] leading-3 text-secondary">
            <Clock size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              {isPendingInvite && pendingInvite?.expiresAt
                ? `${isExpiredPendingInvite ? "Expired" : "Expires"} ${formatUpdatedAt(pendingInvite.expiresAt)}`
                : `Updated ${formatUpdatedAt(project.updated_at)}`}
            </span>
          </p>
        ) : null}
        {showSecondaryMeta && !isPendingInvite ? (
          <p className="flex items-center gap-1.5 text-[9px] leading-3 text-[#5D5D5D]" title={formatFullDate(project.created_at)}>
            <Clock size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">Created {formatUpdatedAt(project.created_at)}</span>
          </p>
        ) : null}
      </div>
    );
  }

  const expandControl = isPendingInvite ? null : (
    <Button
      type="button"
      variant="secondary"
      size="icon-xs"
      className={cn(CONTROL_BUTTON, "text-ink", REVEAL_ON_INTENT)}
      aria-label={`Expand ${project.name} details`}
      onClick={() => onExpand?.(project)}
    >
      <ArrowsOutSimple size={13} weight="regular" aria-hidden="true" />
    </Button>
  );

  function renderThumb({
    wrapperClass,
    motifSize,
    withOverlay,
  }: {
    wrapperClass: string;
    motifSize: string;
    withOverlay: boolean;
  }) {
    return (
      <div className={cn("relative overflow-hidden bg-surfaceMuted", wrapperClass)}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2">
            <span className={cn("truncate font-medium tracking-normal text-secondary", motifSize)}>
              {motif}
            </span>
          </div>
        )}

        {withOverlay ? (
          renderThumbnailReveal()
        ) : null}
      </div>
    );
  }

  function renderFooterAction(): ReactNode {
    if (isExpiredPendingInvite) {
      return (
        <Button type="button" variant="secondary" size="sm" className="min-h-7 shrink-0 px-2.5 text-[10px]" disabled>
          Expired
        </Button>
      );
    }
    if (isPendingInvite && pendingInvite) {
      return (
        <form action={acceptPendingInvitationById}>
          <input type="hidden" name="invitationId" value={pendingInvite.id} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="min-h-7 shrink-0 px-2.5 text-[10px]"
            aria-label={`Accept invite for ${project.name}`}
          >
            Accept
            <ArrowRight size={12} className="shrink-0" aria-hidden="true" />
          </Button>
        </form>
      );
    }
    return (
      <Link
        href={projectHref}
        prefetch={false}
        onBlur={() => cancel(projectHref)}
        onFocus={() => prefetch(projectHref)}
        onMouseEnter={() => prefetch(projectHref)}
        onMouseLeave={() => cancel(projectHref)}
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-xs px-2.5 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {openLabel}
        <ArrowRight
          size={13}
          className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          aria-hidden="true"
        />
      </Link>
    );
  }

  const cardLabel = getAccessibleAccessLabel({
    accessKind,
    projectName: project.name,
    role: currentUserRole,
  });

  // ----- LIST: one horizontal scan-line row (container supplies the border + dividers) -----
  if (isListView) {
    return (
      <article
        data-project-card-view={viewMode}
        data-project-access-kind={accessKind}
        aria-label={cardLabel}
        className={cn(
          "group relative flex min-w-0 items-center gap-3 px-3 py-2 transition-colors duration-150 motion-reduce:transition-none",
          // accentSoft and surfaceMuted are the same grey, so a selected row needs a
          // ring to stay distinct from a merely hovered one during bulk delete.
          selectedForDeletion ? "bg-accentSoft ring-1 ring-inset ring-ink" : "bg-white hover:bg-surfaceMuted",
        )}
      >
        {renderThumb({
          wrapperClass: "size-12 shrink-0 rounded-xs border border-hairline",
          motifSize: "text-[9px]",
          withOverlay: false,
        })}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="min-w-0 truncate text-[11px] font-medium leading-[1.2] tracking-normal text-ink">
              {project.name}
            </h2>
          </div>
          <p className="truncate text-[9px] leading-3 text-secondary">
            {project.client_name ?? "No client yet"}
          </p>
        </div>

        <div
          data-project-card-favorite-sheets=""
          aria-label={
            visibleFavoriteEstimateSheets.length > 0
              ? `Favorite estimate sheets for ${project.name}`
              : `No favorite estimate sheets for ${project.name}`
          }
          className="hidden min-w-0 flex-[0_0_220px] md:block"
        >
          {visibleFavoriteEstimateSheets.length > 0 ? (
            <>
              <p className="truncate text-[8px] font-medium leading-[10px] text-tertiary">Favorite sheets</p>
              <p className="truncate text-[9px] leading-3 text-secondary">
                {visibleFavoriteEstimateSheets.map((sheet) => sheet.name).join(", ")}
              </p>
            </>
          ) : null}
        </div>

        <div className="hidden w-[156px] shrink-0 lg:block">{renderStatusSlot()}</div>

        <p className="hidden min-w-0 max-w-[180px] items-center gap-1 text-[9px] leading-3 text-secondary sm:flex">
          <MapPin size={12} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{project.location ?? "No location"}</span>
        </p>
        <p className="hidden w-[78px] shrink-0 items-center gap-1 text-[9px] leading-3 text-secondary md:flex">
          <Clock size={12} aria-hidden="true" className="shrink-0" />
          <span className="sr-only">{isPendingInvite ? "Invite expires" : "Updated"}</span>
          <span className="truncate">
            {isPendingInvite && pendingInvite?.expiresAt
              ? formatUpdatedAt(pendingInvite.expiresAt)
              : formatUpdatedAt(project.updated_at)}
          </span>
        </p>
        <span className="hidden w-[88px] shrink-0 truncate text-right font-sans text-[9px] font-medium text-secondary lg:block">
          <span className="sr-only">Project code </span>
          {project.project_code ?? "—"}
        </span>

        <div
          className={cn(
            "relative z-20 ml-auto flex shrink-0 items-center gap-1 sm:ml-0",
            // Dead space in this strip must let clicks reach the whole-row link; each
            // control re-asserts pointer-events when revealed/active. Pending rows have
            // no row link, so their always-on Accept button keeps pointer-events.
            isPendingInvite ? null : "pointer-events-none",
          )}
        >
          {selectControl}
          {favoriteControl}
          {expandControl}
          {isPendingInvite ? (
            renderFooterAction()
          ) : (
            <span
              aria-hidden="true"
              className="pointer-events-none inline-flex h-7 shrink-0 items-center gap-1 rounded-xs px-2.5 text-[10px] font-medium text-ink"
            >
              {openLabel}
              <ArrowRight
                size={13}
                className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                aria-hidden="true"
              />
            </span>
          )}
        </div>

        {/* Whole-row navigation; interactive controls sit above this at z-20. */}
        {isPendingInvite ? null : (
          <Link
            href={projectHref}
            prefetch={false}
            aria-label={`${openLabel} ${project.name}`}
            onBlur={() => cancel(projectHref)}
            onFocus={() => prefetch(projectHref)}
            onMouseEnter={() => prefetch(projectHref)}
            onMouseLeave={() => cancel(projectHref)}
            className="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          />
        )}
      </article>
    );
  }

  // ----- TILE: small / medium / large -----
  // Distinct image rhythm per rung so medium and large don't read as one card at two
  // zoom levels: small = square compact, medium = shorter 3:2, large = taller 4:3 showcase.
  const aspectClass =
    viewMode === "small" ? "aspect-square" : viewMode === "medium" ? "aspect-[3/2]" : "aspect-[4/3]";
  const motifSize = "text-[10px]";
  const contentPad = viewMode === "large" ? "p-3" : "p-2";

  return (
    <article
      data-project-card-view={viewMode}
      data-project-access-kind={accessKind}
      aria-label={cardLabel}
      className={cn(
        "group group/card relative flex min-w-0 flex-col overflow-hidden rounded-xs border bg-white transition-colors duration-150 motion-reduce:transition-none",
        selectedForDeletion ? "border-ink" : "border-hairline hover:border-tertiary/30",
        viewMode === "large" ? "h-[360px]" : viewMode === "medium" ? "min-h-[300px]" : "min-h-[190px]",
      )}
    >
      {renderThumb({
        wrapperClass: cn("w-full border-b border-hairline", aspectClass),
        motifSize,
        withOverlay: true,
      })}

      <div className={cn("flex min-w-0 flex-1 flex-col", contentPad)}>
        <div
          className={cn(
            "min-w-0 space-y-1",
            viewMode === "large" ? "min-h-[70px]" : viewMode === "medium" ? "min-h-[64px]" : "min-h-[58px]",
          )}
        >
          {renderTitleBlock()}
          {renderStatusSlot()}
        </div>

        {showMeta ? renderTileMeta() : null}

        {showFooter || isPendingInvite ? (
          <div
            className={cn(
              "mt-auto flex items-center justify-between gap-2 border-t border-hairline",
              viewMode === "large" ? "pt-3" : "pt-2",
            )}
          >
            <span className="truncate font-sans text-[9px] font-medium text-secondary">
              {project.project_code ?? "—"}
            </span>
            {renderFooterAction()}
          </div>
        ) : null}
      </div>

      {/* Small tiles have no footer link: the whole tile is the navigation target. */}
      {viewMode === "small" && !isPendingInvite ? (
        <Link
          href={projectHref}
          prefetch={false}
          aria-label={`Open ${project.name}`}
          onBlur={() => cancel(projectHref)}
          onFocus={() => prefetch(projectHref)}
          onMouseEnter={() => prefetch(projectHref)}
          onMouseLeave={() => cancel(projectHref)}
          className="absolute inset-0 z-10 rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      ) : null}
    </article>
  );
}
