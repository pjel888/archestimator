"use client";

import { useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { Blueprint } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { useLibraryEditorChrome } from "@/hooks/use-library-editor-chrome";
import { InsertIntoEstimatePicker } from "@/components/workshop/library/templates-browse/InsertIntoEstimatePicker";

/**
 * Title block for all library routes. On the template editor route it swaps
 * to the breadcrumb + TEMPLATE mode chip (Decision D6: structural cues, no
 * tint) plus the save indicator and the persistent "Insert into estimate"
 * verb; everywhere else it renders the standard "Library" title.
 */
export function LibraryTitleBarClient() {
  const segments = useSelectedLayoutSegments();
  const breadcrumb = useLibraryEditorChrome((state) => state.breadcrumb);
  const saveState = useLibraryEditorChrome((state) => state.saveState);
  const [insertPickerOpen, setInsertPickerOpen] = useState(false);
  const [insertMessage, setInsertMessage] = useState<string | null>(null);
  const isTemplateEditorRoute = segments[0] === "templates" && segments.length > 1;

  if (isTemplateEditorRoute && breadcrumb) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2" data-workshop-title-region>
        <nav aria-label="Template breadcrumb" className="flex min-w-0 items-center gap-1 text-[10px] leading-4">
          <Link href="/workshop/library" className="shrink-0 text-tertiary transition hover:text-ink">
            Library
          </Link>
          <span className="text-tertiary/60" aria-hidden="true">/</span>
          <Link href="/workshop/library/templates" className="shrink-0 text-tertiary transition hover:text-ink">
            Templates
          </Link>
          <span className="text-tertiary/60" aria-hidden="true">/</span>
          <span className="shrink-0 text-tertiary">{breadcrumb.category}</span>
          <span className="text-tertiary/60" aria-hidden="true">/</span>
          <span className="truncate text-[12px] font-medium text-ink">{breadcrumb.templateName}</span>
        </nav>
        <span
          className="flex h-[18px] shrink-0 items-center gap-1 rounded-xs border border-hairline bg-surfaceMuted px-1.5"
          data-template-mode-chip="true"
        >
          <Blueprint size={10} weight="regular" aria-hidden="true" className="text-tertiary" />
          <span className="text-[8px] font-medium leading-3 text-secondary">TEMPLATE</span>
        </span>
        <span
          aria-live="polite"
          className={
            saveState.state === "error"
              ? "ml-auto shrink-0 text-[9px] leading-3 text-danger"
              : "ml-auto shrink-0 text-[9px] leading-3 text-tertiary"
          }
        >
          {saveState.state === "saving"
            ? "Saving…"
            : saveState.state === "error"
              ? saveState.message
              : insertMessage ?? "Saved · just now"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="min-w-0 shrink-0 px-2 !text-[9px] text-secondary hover:bg-surfaceMuted hover:text-ink"
          onClick={() => {
            setInsertMessage(null);
            setInsertPickerOpen(true);
          }}
        >
          Insert into estimate
        </Button>
        <InsertIntoEstimatePicker
          open={insertPickerOpen}
          onOpenChange={setInsertPickerOpen}
          template={{
            id: breadcrumb.templateId,
            name: breadcrumb.templateName,
            description: "",
            category: breadcrumb.category,
            nodes: [],
          }}
          onInserted={(estimateName) => setInsertMessage(`Inserted into ${estimateName}.`)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-0.5" data-workshop-title-region>
      <div className="min-w-0" data-workshop-title-block>
        <h1 className="truncate text-[12px] font-medium leading-4 tracking-normal text-ink">Library</h1>
      </div>
    </div>
  );
}
