"use client";

import { DotsThreeVertical } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

type ProjectCardDetailsControlProps = {
  className: string;
  disabled: boolean;
  projectName: string;
  onExpand: () => void;
};

export function ProjectCardDetailsControl({
  className,
  disabled,
  projectName,
  onExpand,
}: ProjectCardDetailsControlProps) {
  function handleClick() {
    if (disabled) return;
    onExpand();
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-xs"
      className={className}
      aria-label={`Expand ${projectName} details`}
      aria-disabled={disabled}
      data-project-card-details-action=""
      onClick={handleClick}
    >
      <DotsThreeVertical size={15} weight="regular" aria-hidden="true" />
    </Button>
  );
}
