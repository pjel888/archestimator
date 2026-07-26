"use client";

import { ArrowRight, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { Button, ButtonLink } from "@/components/ui/button";
import { acceptPendingInvitationById } from "@/lib/collaboration/pending-invite-actions";
import type { WorkshopPendingInviteSummary } from "@/lib/repositories/workspace-repository";
import { cn } from "@/lib/ui/cn";

type ProjectCardFooterActionProps = {
  isExpiredPendingInvite: boolean;
  isPendingInvite: boolean;
  openControlLinkClassName: string;
  openLabel: string;
  pendingInvite: WorkshopPendingInviteSummary | null;
  projectHref: string;
  projectName: string;
  setupNavigationDisabled: boolean;
  onCancelPrefetch: (href: string) => void;
  onPrefetch: (href: string) => void;
};

export function ProjectCardFooterAction({
  isExpiredPendingInvite,
  isPendingInvite,
  openControlLinkClassName,
  openLabel,
  pendingInvite,
  projectHref,
  projectName,
  setupNavigationDisabled,
  onCancelPrefetch,
  onPrefetch,
}: ProjectCardFooterActionProps) {
  function handleBlur() {
    onCancelPrefetch(projectHref);
  }

  function handleFocus() {
    onPrefetch(projectHref);
  }

  function handleMouseEnter() {
    onPrefetch(projectHref);
  }

  function handleMouseLeave() {
    onCancelPrefetch(projectHref);
  }

  if (setupNavigationDisabled && !isPendingInvite) {
    return (
      <span
        aria-disabled="true"
        className={cn("cursor-wait opacity-70", openControlLinkClassName)}
      >
        <ArrowSquareOut
          size={15}
          data-project-card-open-icon="square-out"
          className="shrink-0"
          aria-hidden="true"
        />
      </span>
    );
  }

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
          aria-label={`Accept invite for ${projectName}`}
        >
          Accept
          <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
        </Button>
      </form>
    );
  }

  return (
    <ButtonLink
      href={projectHref}
      variant="plain"
      size="icon-xs"
      prefetch={false}
      aria-label={openLabel}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={openControlLinkClassName}
    >
      <ArrowSquareOut
        size={15}
        data-project-card-open-icon="square-out"
        className="shrink-0"
        aria-hidden="true"
      />
    </ButtonLink>
  );
}
