"use client";

import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

type ProjectCardDetailsControlProps = {
  className: string;
  disabled: boolean;
  projectName: string;
  ariaLabel?: string;
  onExpand?: () => void;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-disabled" | "aria-label" | "children" | "className" | "disabled" | "onClick" | "type"
> & {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
};

export function ProjectCardDetailsControl({
  className,
  disabled,
  projectName,
  ariaLabel,
  onExpand,
  onClick,
  ...buttonProps
}: ProjectCardDetailsControlProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
    if (event.defaultPrevented) return;
    onExpand?.();
  }

  return (
    <Button
      {...buttonProps}
      type="button"
      variant="secondary"
      size="icon-xs"
      className={className}
      aria-label={ariaLabel ?? `Expand ${projectName} details`}
      aria-disabled={disabled}
      disabled={disabled}
      data-project-card-details-action=""
      onClick={handleClick}
    >
      <DotsThreeVertical size={15} weight="regular" aria-hidden="true" />
    </Button>
  );
}
