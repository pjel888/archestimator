import type { ReactNode } from "react";

export type DropdownRendererItemProps = {
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "destructive";
  onSelect: () => void;
};
