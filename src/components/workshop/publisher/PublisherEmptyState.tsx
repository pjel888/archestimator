import { FileX, Monitor } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/ui/empty-state";

type PublisherNoRowsEmptyStateProps = {
  variant?: "filtered" | "no-publications" | "mobile";
};

export function PublisherNoRowsEmptyState({ variant = "no-publications" }: PublisherNoRowsEmptyStateProps) {
  const copy = {
    filtered: {
      icon: <FileX size={16} weight="regular" aria-hidden="true" />,
      title: "No matching publications",
      description: "Clear the active filters or search by project, client, or publication.",
    },
    mobile: {
      icon: <Monitor size={16} weight="regular" aria-hidden="true" />,
      title: "Sharing needs more width",
      description: "Open this workspace on a wider screen to manage shared pages.",
    },
    "no-publications": {
      icon: <FileX size={16} weight="regular" aria-hidden="true" />,
      title: "No publishable projects",
      description: "Projects you can manage will appear here once they are ready for shared pages.",
    },
  }[variant];

  return (
    <EmptyState
      icon={copy.icon}
      title={copy.title}
      description={copy.description}
      className="h-full min-h-56 w-full rounded-xs"
    />
  );
}
