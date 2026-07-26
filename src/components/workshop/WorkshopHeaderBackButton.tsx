"use client";

import { usePathname } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { ButtonLink } from "@/components/ui/button";
import { PROJECT_HEADER_ACTION_BUTTON_CLASS, PROJECT_HEADER_ACTION_ICON_SIZE } from "./project-header-action-styles";

const WORKSHOP_PRIMARY_ROUTES = new Set([
  "/workshop",
  "/workshop/projects",
  "/workshop/library",
  "/workshop/proposals",
  "/workshop/publisher",
]);

function getProjectBackHref(pathname: string) {
  const match = pathname.match(/^\/workshop\/projects\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;

  const [, projectId, remainder] = match;
  const projectHref = `/workshop/projects/${projectId}`;
  if (!remainder) return "/workshop/projects";
  if (remainder.startsWith("estimates/")) return `${projectHref}/estimates`;
  if (remainder.startsWith("client-portals/") && remainder.endsWith("/discussions")) {
    return `${projectHref}/${remainder.slice(0, -"/discussions".length)}`;
  }
  if (remainder.startsWith("client-portals/")) return `${projectHref}/client-portals`;
  return projectHref;
}

function getBackHref(pathname: string | null) {
  if (!pathname || WORKSHOP_PRIMARY_ROUTES.has(pathname)) return null;

  const projectBackHref = getProjectBackHref(pathname);
  if (projectBackHref) return projectBackHref;
  if (pathname.startsWith("/workshop/library/")) return "/workshop/library";
  if (pathname.startsWith("/workshop/publisher/preview/")) return "/workshop/publisher";
  if (pathname.startsWith("/workshop/settings/")) return "/workshop/settings";
  if (pathname.startsWith("/workshop/")) return "/workshop";

  return null;
}

export function WorkshopHeaderBackButton() {
  const backHref = getBackHref(usePathname());

  if (!backHref) return <span className="size-8 shrink-0" aria-hidden="true" />;

  return (
    <ButtonLink
      href={backHref}
      variant="ghost"
      size="icon-sm"
      className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
      aria-label="Go back"
      title="Go back"
      data-workshop-header-back-button
    >
      <ArrowLeft size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />
    </ButtonLink>
  );
}
