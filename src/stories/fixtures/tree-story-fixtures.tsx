import { Folder } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { StoryPanel } from "../ui-library/story-canvas";

export function TreeShellPreviewForDomain({ label = "Demo scope" }: { label?: string }) {
  return (
    <StoryPanel className="max-w-sm space-y-1">
      {["General requirements", "Millwork", "Loose furniture"].map((item, index) => (
        <div
          key={item}
          className="flex min-h-7 items-center gap-2 rounded-xs px-2 text-[10px] font-medium leading-4 text-secondary"
          style={{ paddingLeft: `${8 + index * 8}px` }}
        >
          <Folder size={12} weight="regular" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{index === 0 ? label : item}</span>
          <Badge size="xs">{index === 0 ? "group" : "area"}</Badge>
        </div>
      ))}
    </StoryPanel>
  );
}
