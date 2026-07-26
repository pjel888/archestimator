import { FileX, Monitor } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type PublisherNoRowsEmptyStateProps = {
  action?: ReactNode;
  variant?: "filtered" | "no-publications" | "mobile";
};

export function PublisherNoRowsEmptyState({ action, variant = "no-publications" }: PublisherNoRowsEmptyStateProps) {
  const copy = {
    filtered: {
      icon: <FileX size={16} weight="regular" aria-hidden="true" />,
      title: "No matching client links",
      description: "Clear the filters or search by project or client name.",
    },
    mobile: {
      icon: <Monitor size={16} weight="regular" aria-hidden="true" />,
      title: "Sharing needs more width",
      description: "Open this workspace on a wider screen to manage shared pages.",
    },
    "no-publications": {
      icon: <FileX size={16} weight="regular" aria-hidden="true" />,
      title: "No client links yet",
      description: "Choose a project to create its first client link.",
    },
  }[variant];

  return (
    <EmptyState
      icon={copy.icon}
      title={copy.title}
      description={copy.description}
      action={action ?? (variant === "no-publications" ? (
        <ButtonLink href="/workshop/projects" variant="secondary" size="sm" className="min-h-8 min-w-0 px-2.5 !text-[10px] focus-visible:ring-offset-0">
          View projects
        </ButtonLink>
      ) : null)}
      className="h-full min-h-44 w-full rounded-xs [&>p:first-of-type]:!text-[12px] [&>p:nth-of-type(2)]:!max-w-xs [&>p:nth-of-type(2)]:!text-[10px]"
    />
  );
}
