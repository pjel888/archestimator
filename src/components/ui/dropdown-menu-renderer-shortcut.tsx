import type { ReactNode } from "react";

export function DropdownMenuRendererShortcut({ children }: { children: ReactNode }) {
  return <span className="ml-auto text-[9px] font-medium leading-3 text-tertiary">{children}</span>;
}
