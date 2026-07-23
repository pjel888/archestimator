import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/ui/cn";

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ icon, label, className, variant = "ghost", size = "icon", ...props }: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("shrink-0 [&_svg]:pointer-events-none", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </Button>
  );
}
