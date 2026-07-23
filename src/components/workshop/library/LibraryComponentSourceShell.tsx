"use client";

import { Buildings, Package, Storefront } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { cn } from "@/lib/ui/cn";

export type LibraryComponentSource = "library" | "project";

export type LibraryComponentProjectOption = {
  id: string;
  label: string;
};

const COMPONENT_SOURCE_ID_BASE = "library-component-source";
const COMPONENT_SOURCE_TABS = [
  {
    id: "library",
    label: "Library",
    icon: <Package size={16} weight="regular" aria-hidden="true" />,
  },
  {
    id: "project",
    label: "Project",
    icon: <Buildings size={16} weight="regular" aria-hidden="true" />,
  },
  {
    id: "supplier",
    label: "Supplier",
    icon: <Storefront size={16} weight="regular" aria-hidden="true" />,
    badge: "Soon",
  },
] as const satisfies readonly TabItem[];

function projectSourceHref(projectId?: string | null) {
  const params = new URLSearchParams({ source: "project" });
  if (projectId) params.set("projectId", projectId);
  return `/workshop/library/components?${params.toString()}`;
}

export function LibraryComponentSourceShell({
  activeSource,
  activeProjectId,
  projects = [],
  children,
}: {
  activeSource: LibraryComponentSource;
  activeProjectId?: string | null;
  projects?: LibraryComponentProjectOption[];
  children: ReactNode;
}) {
  const router = useRouter();
  const projectOptions: DropdownSelectOption[] = projects.map((project) => ({
    value: project.id,
    label: project.label,
    icon: <Buildings size={16} weight="regular" aria-hidden="true" />,
  }));

  const changeSource = (source: string) => {
    if (source === "library") {
      router.push("/workshop/library/components");
      return;
    }
    if (source === "project") {
      router.push(projectSourceHref(activeProjectId ?? projects[0]?.id));
    }
  };

  const supplierDescriptionId = `${COMPONENT_SOURCE_ID_BASE}-supplier-description`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" data-component-source={activeSource}>
      <div className="shrink-0 px-2">
        <Tabs
          tabs={COMPONENT_SOURCE_TABS}
          activeId={activeSource}
          onChange={changeSource}
          ariaLabel="Component sources"
          idBase={COMPONENT_SOURCE_ID_BASE}
          activationMode="manual"
          variant="underline"
          className="min-h-8"
          endAction={activeSource === "project" && projectOptions.length > 0 ? (
            <DropdownSelect
              aria-label="Project component source"
              options={projectOptions}
              value={activeProjectId ?? projectOptions[0]?.value}
              onValueChange={(projectId) => router.push(projectSourceHref(projectId))}
              variant="boxed"
              triggerTitlePrefix="Project"
              className="h-7 w-[min(220px,35vw)] bg-white/65 text-[10px]"
              panelClassName="min-w-[220px]"
            />
          ) : null}
          getTabButtonProps={(tab) => {
            const baseClassName = "min-h-8 px-2.5 py-1 text-[10px]";
            if (tab.id !== "supplier") return { className: baseClassName };
            return {
              "aria-disabled": true,
              "aria-describedby": supplierDescriptionId,
              title: "Supplier-managed catalogues are coming soon",
              className: cn(baseClassName, "cursor-not-allowed opacity-55"),
              onClick: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
              onKeyDown: (event) => {
                if (event.key === "Enter" || event.key === " ") event.preventDefault();
              },
            };
          }}
        />
        <span id={supplierDescriptionId} className="sr-only">
          Supplier content is planned and is not available yet.
        </span>
      </div>

      {COMPONENT_SOURCE_TABS.map((tab) => {
        const isActive = tab.id === activeSource;
        return (
          <section
            key={tab.id}
            id={`${COMPONENT_SOURCE_ID_BASE}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${COMPONENT_SOURCE_ID_BASE}-tab-${tab.id}`}
            hidden={!isActive}
            className={cn("min-h-0 flex-1 overflow-hidden", !isActive && "hidden")}
          >
            {isActive ? children : null}
          </section>
        );
      })}
    </div>
  );
}
