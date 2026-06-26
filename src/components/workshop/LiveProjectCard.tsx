"use client";

import Link from "next/link";
import { memo, useMemo, type ReactNode } from "react";
import { ArrowSquareOut, Clock, FileText, Globe, MapPin, Star, Users } from "@phosphor-icons/react/dist/ssr";

import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import type { Json, Tables } from "@/lib/supabase/types";
import { getProjectLocationStaticMapStyleParams } from "@/lib/google-maps/project-location-map-style";
import { cn } from "@/lib/ui/cn";
import type { CollaborationRole } from "@/lib/collaboration/types";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type {
  ProjectFavoriteEstimateSheetSummary,
  WorkshopPendingInviteSummary,
} from "@/lib/repositories/workspace-repository";
import { ProjectCardDetailsControl } from "./ProjectCardDetailsControl";
import { ProjectCardFavoriteControl } from "./ProjectCardFavoriteControl";
import { ProjectCardFooterAction } from "./ProjectCardFooterAction";
import { ProjectCardSelectControl } from "./ProjectCardSelectControl";
import { ProjectCardStatusSlot } from "./ProjectCardStatusSlot";
import { ProjectCardSetupOverlay } from "./ProjectCardSetupOverlay";
import { ProjectCardThumbnail } from "./ProjectCardThumbnail";
import { ProjectCardThumbnailReveal } from "./ProjectCardThumbnailReveal";
import { ProjectCardTitleBlock } from "./ProjectCardTitleBlock";

const EMPTY_FAVORITE_ESTIMATE_SHEETS: ProjectFavoriteEstimateSheetSummary[] = [];

export type ProjectCardViewMode = "list" | "small" | "medium" | "large";
export type ProjectAccessKind = "owned" | "pending-invite" | "project-member" | "sheet-member";
export type ProjectCardSetupStatus = {
  state: "creating" | "preparing" | "error";
  message: string;
};

type LiveProjectCardProps = {
  project: Tables<"projects">;
  viewMode?: ProjectCardViewMode;
  accessKind?: ProjectAccessKind;
  googleMapsApiKey?: string;
  currentUserRole?: CollaborationRole;
  ownerWorkspaceName?: string | null;
  pendingInvite?: WorkshopPendingInviteSummary | null;
  pendingInviteCount?: number;
  setupStatus?: ProjectCardSetupStatus | null;
  setupNavigationDisabled?: boolean;
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
  /**
   * Group-assignment menu (D8): the "Move to group" affordance rendered next to the
   * details-action control on owned cards. The card stays agnostic — the page builds
   * and supplies the node (only for owned projects in Group mode) so all group logic
   * lives in projects-page-client. Rendered in the DETAILS-ACTION menu, NOT the C3
   * hover overlay. Optional and additive: omitting it leaves the card unchanged.
   */
  groupAssignMenu?: ReactNode;
};

// Action affordances rest hidden and reveal on hover or keyboard focus so the
// thumbnail reads as the project image first. While hidden they are
// pointer-events-none, so a click on the image corner falls through to the tile
// link instead of hitting an invisible button. They stay keyboard-focusable
// (Tab reveals them via focus-within). Touch devices (no hover) keep them visible.
const REVEAL_ON_INTENT =
  "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

const CONTROL_BUTTON = "workshop-project-card-control size-6 border-hairline";
const OPEN_CONTROL_LINK =
  "workshop-project-card-control grid size-6 shrink-0 place-items-center rounded-xs border border-hairline text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";
const projectCardUpdatedAtFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});
const projectCardFullDateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

function formatUpdatedAt(value: string) {
  return projectCardUpdatedAtFormatter.format(new Date(value));
}

function formatFullDate(value: string) {
  return projectCardFullDateFormatter.format(new Date(value));
}

function getProjectImageUrl(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return null;
  const record = metadata as Record<string, Json>;
  // Prefer the 512px thumbnail the upload pipeline already generates — the card frame is
  // only ~248-320px wide, so serving the 1600px full image was ~85-90% wasted bytes. Fall
  // back to the full image for projects uploaded before the thumbnail variant existed.
  const value = record.projectImageThumbnailUrl ?? record.projectImageUrl;
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

function getProjectMapThumbnailUrl(project: Tables<"projects">, apiKey: string) {
  const location = project.location?.trim();
  const key = apiKey.trim();
  if (!location || !key) return null;

  const params = new URLSearchParams({
    center: location,
    zoom: "14",
    size: "640x480",
    scale: "2",
    maptype: "roadmap",
    key,
  });
  params.append("markers", `color:0xF24405|${location}`);
  for (const style of getProjectLocationStaticMapStyleParams()) {
    params.append("style", style);
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
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

function getFavoriteEstimateSheetHref(sheet: ProjectFavoriteEstimateSheetSummary) {
  return `/workshop/projects/${sheet.project_id}/estimates/${sheet.id}`;
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

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
function LiveProjectCardImpl({
  project,
  viewMode = "large",
  accessKind = "owned",
  googleMapsApiKey = "",
  currentUserRole = "owner",
  ownerWorkspaceName = null,
  pendingInvite = null,
  pendingInviteCount = 0,
  setupStatus = null,
  setupNavigationDisabled = false,
  publicationSummary = null,
  sharedEstimateCount = 0,
  favoriteEstimateSheets = EMPTY_FAVORITE_ESTIMATE_SHEETS,
  isFavorite = false,
  favoriteBusy = false,
  selectedForDeletion = false,
  selectionActive = false,
  onToggleSelected,
  onToggleFavorite,
  onExpand,
  groupAssignMenu,
}: LiveProjectCardProps) {
  const imageUrl = getProjectImageUrl(project.metadata);
  const mapImageUrl = imageUrl ? null : getProjectMapThumbnailUrl(project, googleMapsApiKey);
  const isListView = viewMode === "list";
  const isPendingInvite = accessKind === "pending-invite";
  const isExpiredPendingInvite = isPendingInvite && pendingInvite?.state === "expired";
  const isSharedAccess = accessKind !== "owned" && !isPendingInvite;
  const canToggleFavorite = Boolean(onToggleFavorite) && !isPendingInvite;
  const canShowSelect = !isPendingInvite;
  const canSelect = Boolean(onToggleSelected) && canShowSelect;
  const openLabel = accessKind === "sheet-member" && sharedEstimateCount === 1 ? "Open estimate" : "Open";
  const projectHref = `/workshop/projects/${project.id}`;
  const prefetchRoutes = useMemo(() => [{ pathname: projectHref }], [projectHref]);
  const { prefetch, cancel } = usePrefetchOnHover(prefetchRoutes);
  const motif = getProjectMotif(project);
  const setupBusy = setupStatus?.state === "creating" || setupStatus?.state === "preparing";

  // Density ladder: view modes change card width/content density, while every
  // project thumbnail keeps the same 4:3 architectural image frame.
  const hasInvites = accessKind === "owned" && pendingInviteCount > 0;
  const showMeta = !isListView && viewMode !== "small";
  const showSecondaryMeta = viewMode === "large";
  const showFooter = !isListView && viewMode !== "small";
  const visibleFavoriteEstimateSheets = favoriteEstimateSheets.slice(0, 5);

  const accessChip = isPendingInvite ? (
    <span
      key="access"
      className={cn(
        "workshop-project-card-vital workshop-project-card-vital--warning inline-flex shrink-0 items-center gap-1 rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px]",
      )}
    >
      <Clock size={10} weight="regular" aria-hidden="true" />
      {isExpiredPendingInvite ? "Invite expired" : getAccessBadgeLabel(accessKind)}
    </span>
  ) : isSharedAccess ? (
    <span
      key="access"
      className={cn(
        "workshop-project-card-vital workshop-project-card-vital--shared inline-flex shrink-0 items-center gap-1 rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px]",
      )}
    >
      <Users size={10} weight="regular" aria-hidden="true" />
      {getAccessBadgeLabel(accessKind)}
    </span>
  ) : null;

  const invitesChip = hasInvites ? (
    <span
      key="invites"
      className="workshop-project-card-vital inline-flex shrink-0 items-center gap-1 rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px]"
    >
      <Users size={10} weight="regular" aria-hidden="true" />
      {pendingInviteCount} {pendingInviteCount === 1 ? "invite" : "invites"}
    </span>
  ) : null;

  function handleToggleSelected() {
    onToggleSelected?.(project.id);
  }

  function handleToggleFavorite() {
    onToggleFavorite?.(project.id, !isFavorite);
  }

  const selectControl = (
    <ProjectCardSelectControl
      canSelect={canSelect}
      canShowSelect={canShowSelect}
      projectName={project.name}
      revealOnIntentClassName={REVEAL_ON_INTENT}
      selectedForDeletion={selectedForDeletion}
      selectionActive={selectionActive}
      onToggleSelected={handleToggleSelected}
    />
  );

  const favoriteControl = (
    <ProjectCardFavoriteControl
      canToggleFavorite={canToggleFavorite}
      controlButtonClassName={CONTROL_BUTTON}
      favoriteBusy={favoriteBusy}
      isFavorite={isFavorite}
      projectName={project.name}
      revealOnIntentClassName={REVEAL_ON_INTENT}
      onToggleFavorite={handleToggleFavorite}
    />
  );

  const statusChips = [accessChip, invitesChip].filter(Boolean);

  function handleExpandDetails() {
    onExpand?.(project);
  }

  const expandControl = isPendingInvite ? null : (
    <ProjectCardDetailsControl
      className={cn(CONTROL_BUTTON, "relative z-20 text-ink", REVEAL_ON_INTENT)}
      disabled={setupNavigationDisabled}
      projectName={project.name}
      onExpand={handleExpandDetails}
    />
  );

  function renderTileMeta() {
    return (
      <div
        data-project-card-meta-stack=""
        className={cn("space-y-1", viewMode === "large" ? "mt-2.5" : "mt-2")}
      >
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
        {isPendingInvite && pendingInvite?.expiresAt ? (
          <p className="flex items-center gap-1.5 text-[9px] leading-3 text-secondary">
            <Clock size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">
              {isExpiredPendingInvite ? "Expired" : "Expires"} {formatUpdatedAt(pendingInvite.expiresAt)}
            </span>
          </p>
        ) : null}
        {showSecondaryMeta && !isPendingInvite ? (
          <div
            data-project-card-date-band=""
            className="mt-2 grid grid-cols-2 gap-1 border-t border-hairline pt-1 text-[9px] leading-3"
            title={`Created ${formatFullDate(project.created_at)}; updated ${formatFullDate(project.updated_at)}`}
          >
            <div
              data-project-card-date-cell="created"
              className="min-w-0 rounded-xs border border-hairline bg-surfaceMuted px-2 py-1.5"
            >
              <p className="truncate text-[8px] font-medium leading-[10px] text-tertiary">Created</p>
              <p className="mt-0.5 truncate font-medium text-ink">{formatUpdatedAt(project.created_at)}</p>
            </div>
            <div
              data-project-card-date-cell="updated"
              className="min-w-0 rounded-xs border border-hairline bg-surfaceMuted px-2 py-1.5"
            >
              <p className="truncate text-[8px] font-medium leading-[10px] text-tertiary">Updated</p>
              <p className="mt-0.5 truncate font-medium text-ink">{formatUpdatedAt(project.updated_at)}</p>
            </div>
          </div>
        ) : null}
        {showMeta && !isPendingInvite ? renderProjectVitals() : null}
      </div>
    );
  }

  function renderProjectVitals() {
    const hasSharedEstimates = sharedEstimateCount > 0;
    const isPublished = publicationSummary?.status === "published";
    if (!isPublished && !hasSharedEstimates) return null;

    return (
      <div
        data-project-card-vitals=""
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-1",
          viewMode === "large" ? "mt-2" : "mt-1.5",
        )}
        aria-label={`Project details for ${project.name}`}
      >
        {isPublished ? (
          <span className="workshop-project-card-vital workshop-project-card-vital--published">
            <Globe size={10} weight="regular" aria-hidden="true" />
            <span>Published</span>
            {typeof publicationSummary?.openCount === "number" && publicationSummary.openCount > 0 ? (
              <span className="tabular-nums">{publicationSummary.openCount} views</span>
            ) : null}
          </span>
        ) : null}
        {hasSharedEstimates ? (
          <span className="workshop-project-card-vital workshop-project-card-vital--shared">
            <FileText size={10} weight="regular" aria-hidden="true" />
            <span className="tabular-nums">
              {sharedEstimateCount} {sharedEstimateCount === 1 ? "estimate" : "estimates"}
            </span>
          </span>
        ) : null}
      </div>
    );
  }

  const footerAction = (
    <ProjectCardFooterAction
      isExpiredPendingInvite={isExpiredPendingInvite}
      isPendingInvite={isPendingInvite}
      openControlLinkClassName={OPEN_CONTROL_LINK}
      openLabel={openLabel}
      pendingInvite={pendingInvite}
      projectHref={projectHref}
      projectName={project.name}
      setupNavigationDisabled={setupNavigationDisabled}
      onCancelPrefetch={cancel}
      onPrefetch={prefetch}
    />
  );
  const thumbnailReveal = (
    <ProjectCardThumbnailReveal
      getSheetHref={getFavoriteEstimateSheetHref}
      projectName={project.name}
      viewMode={viewMode}
      visibleFavoriteEstimateSheets={visibleFavoriteEstimateSheets}
    />
  );

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
        data-project-card-selected={selectedForDeletion ? "true" : undefined}
        data-project-card-setup-state={setupStatus?.state}
        aria-label={cardLabel}
        aria-busy={setupBusy || undefined}
        className={cn(
          "workshop-project-card-glass group relative flex min-w-0 items-center gap-3 px-3 py-2 motion-reduce:transition-none",
          // Perf: skip layout/paint for off-screen list rows too (off-screen borders aren't
          // visible; the `auto` intrinsic size self-corrects to each row's real height).
          "[content-visibility:auto] [contain-intrinsic-size:auto_52px]",
          // accentSoft and surfaceMuted are the same grey, so a selected row needs a
          // ring to stay distinct from a merely hovered one during bulk delete.
          selectedForDeletion ? "ring-1 ring-inset ring-ink" : null,
        )}
      >
        <ProjectCardThumbnail
          fallbackSeed={`${project.id}:${project.name}`}
          imageUrl={imageUrl}
          isListView={isListView}
          mapImageUrl={mapImageUrl}
          motif={motif}
          motifSize="text-[9px]"
          wrapperClass="size-12 shrink-0 rounded-xs border border-hairline"
        />

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
              <Star size={10} weight="regular" aria-hidden="true" className="mb-1 text-warning" />
              <div className="relative z-20 flex min-w-0 flex-wrap gap-x-1 gap-y-0.5 text-[9px] leading-3 text-secondary">
                {visibleFavoriteEstimateSheets.map((sheet, index) => (
                  <span key={sheet.id} className="inline-flex min-w-0 max-w-full items-center">
                    <Link
                      href={getFavoriteEstimateSheetHref(sheet)}
                      prefetch={false}
                      className="max-w-full truncate rounded-xs hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      title={sheet.sheet_code ? `${sheet.name} (${sheet.sheet_code})` : sheet.name}
                    >
                      {sheet.name}
                    </Link>
                    {index < visibleFavoriteEstimateSheets.length - 1 ? (
                      <span aria-hidden="true">,</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="hidden w-[156px] shrink-0 lg:block">
          <ProjectCardStatusSlot statusChips={statusChips} />
        </div>

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
          {groupAssignMenu}
          {expandControl}
          {isPendingInvite ? (
            footerAction
          ) : (
            <span
              aria-hidden="true"
              className={cn("pointer-events-none", OPEN_CONTROL_LINK)}
            >
              <ArrowSquareOut
                size={15}
                data-project-card-open-icon="square-out"
                className="shrink-0"
                aria-hidden="true"
              />
            </span>
          )}
        </div>

        {/* Whole-row navigation; interactive controls sit above this at z-20. */}
        {isPendingInvite || setupNavigationDisabled ? null : (
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
        <ProjectCardSetupOverlay setupStatus={setupStatus} setupBusy={setupBusy} />
      </article>
    );
  }

  // ----- TILE: small / medium / large -----
  // Two-layer card: a translucent liquid-glass BASE wraps an inset white inner
  // card. The base carries the single armed backdrop-filter; the inner card is
  // crisp opaque paper (no second blur). The translucent TOP STRIP above the
  // inner card reveals select (left) + star / group / kebab (right) on hover.
  const thumbnailAspectClass = "aspect-[4/3]";
  const motifSize = "text-[10px]";
  const contentPad = "p-2";

  return (
    <article
      data-project-card-view={viewMode}
      data-project-access-kind={accessKind}
      data-project-card-selected={selectedForDeletion ? "true" : undefined}
      data-project-card-setup-state={setupStatus?.state}
      aria-label={cardLabel}
      aria-busy={setupBusy || undefined}
      className={cn(
        // Border-radius now comes from the .workshop-project-card-glass rule
        // (var(--project-card-base-radius)) so the glass base is larger than the
        // inset inner card and a translucent band reads around the paper.
        "workshop-project-card-glass group group/card relative flex min-w-0 flex-col overflow-hidden border p-1 motion-reduce:transition-none",
        selectedForDeletion ? "border-ink" : "border-hairline",
        viewMode === "large" ? "min-h-[372px]" : viewMode === "medium" ? "min-h-[316px]" : "min-h-[216px]",
        // Perf: let the browser skip layout/paint for off-screen cards. The `auto` intrinsic
        // size remembers each card's real height after first render (no lasting scroll drift),
        // seeded with the per-mode min-height (bumped to absorb the top strip + base padding).
        "[content-visibility:auto]",
        viewMode === "large"
          ? "[contain-intrinsic-size:auto_372px]"
          : viewMode === "medium"
            ? "[contain-intrinsic-size:auto_316px]"
            : "[contain-intrinsic-size:auto_216px]",
      )}
    >
      {/* Translucent TOP STRIP: hover-revealed controls sitting in the glass
          band above the inset white card (select leftmost, star/group/kebab right). */}
      <div
        data-project-card-top-strip=""
        className="relative z-20 flex items-center justify-between gap-2 pb-2"
      >
        <div className="flex shrink-0 items-center gap-1">{selectControl}</div>
        <div className="flex shrink-0 items-center gap-1">
          {groupAssignMenu}
          {favoriteControl}
          {expandControl}
        </div>
      </div>

      {/* INSET WHITE inner card: thumbnail + content. The image is its own
          rounded, shadowed layer so the information area reads underneath it. */}
      <div data-project-card-inner="" className="workshop-project-card-inner flex min-w-0 flex-1 flex-col">
        <ProjectCardThumbnail
          fallbackSeed={`${project.id}:${project.name}`}
          imageUrl={imageUrl}
          isListView={isListView}
          mapImageUrl={mapImageUrl}
          motif={motif}
          motifSize={motifSize}
          wrapperClass={cn(
            "workshop-project-card-thumbnail-surface relative z-10 w-full rounded-t-[var(--project-card-inner-radius)] border-b border-hairline",
            thumbnailAspectClass,
          )}
        >
          {thumbnailReveal}
        </ProjectCardThumbnail>

        <div
          data-project-card-tile-content=""
          className={cn(
            "workshop-project-card-content relative z-0 flex min-w-0 flex-1 flex-col rounded-b-[var(--project-card-inner-radius)]",
            viewMode === "large" ? "justify-between" : null,
            contentPad,
          )}
        >
          <div
            data-project-card-title-block=""
            className={cn(
              "min-w-0 space-y-1",
              viewMode === "large" ? "min-h-[70px]" : viewMode === "medium" ? "min-h-[64px]" : "min-h-[58px]",
            )}
          >
            <ProjectCardTitleBlock
              clientName={project.client_name}
              location={project.location}
              projectName={project.name}
              viewMode={viewMode}
            />
            <ProjectCardStatusSlot statusChips={statusChips} />
          </div>

          {showMeta ? renderTileMeta() : null}

          {showFooter || isPendingInvite ? (
            <div
              data-project-card-footer=""
              className={cn(
                "flex items-center justify-between gap-2 border-t border-hairline",
                viewMode === "large" ? "mt-0 pt-2" : "mt-auto pt-2",
              )}
            >
              <span className="truncate font-sans text-[9px] font-medium text-secondary">
                {project.project_code ?? "—"}
              </span>
              {footerAction}
            </div>
          ) : null}
        </div>
      </div>

      {/* Small tiles have no footer link: the whole tile is the navigation target. */}
      {viewMode === "small" && !isPendingInvite && !setupNavigationDisabled ? (
        <Link
          href={projectHref}
          prefetch={false}
          aria-label={`Open ${project.name}`}
          onBlur={() => cancel(projectHref)}
          onFocus={() => prefetch(projectHref)}
          onMouseEnter={() => prefetch(projectHref)}
          onMouseLeave={() => cancel(projectHref)}
          className="absolute inset-0 z-10 rounded-[var(--project-card-base-radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      ) : null}
      <ProjectCardSetupOverlay setupStatus={setupStatus} setupBusy={setupBusy} />
    </article>
  );
}

// Memoized so cards skip re-render when an unrelated parent state slice changes. Binds in
// the default (non-group) view where `groupAssignMenu` is undefined and the toggle handlers
// are identity-stable (useStableCallback); owned cards in group-organize mode still update
// because their per-card props (effective group, busy) change meaningfully.
export const LiveProjectCard = memo(LiveProjectCardImpl);
