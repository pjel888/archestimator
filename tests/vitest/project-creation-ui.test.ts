import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectsPage = readFileSync("src/app/workshop/projects/page.tsx", "utf8");
const projectsPageClient = readFileSync(
  "src/components/workshop/projects-page-client.tsx",
  "utf8",
);
const newProjectModal = readFileSync(
  "src/components/workshop/NewProjectModal.tsx",
  "utf8",
);
const projectDetailsModal = readFileSync(
  "src/components/workshop/ProjectDetailsModal.tsx",
  "utf8",
);
const newProjectForm = readFileSync(
  "src/components/workshop/NewProjectForm.tsx",
  "utf8",
);
const newProjectFormSections = readFileSync(
  "src/components/workshop/NewProjectFormSections.tsx",
  "utf8",
);
const newProjectImagePanel = readFileSync(
  "src/components/workshop/NewProjectImagePanel.tsx",
  "utf8",
);
const appGlobals = readFileSync("src/app/globals.css", "utf8");
const liveProjectCard = readFileSync(
  "src/components/workshop/LiveProjectCard.tsx",
  "utf8",
);
const projectCardThumbnail = readFileSync(
  "src/components/workshop/ProjectCardThumbnail.tsx",
  "utf8",
);
const projectCardThumbnailReveal = readFileSync(
  "src/components/workshop/ProjectCardThumbnailReveal.tsx",
  "utf8",
);
const projectCardFavoriteControl = readFileSync(
  "src/components/workshop/ProjectCardFavoriteControl.tsx",
  "utf8",
);
const projectCardSetupOverlay = readFileSync(
  "src/components/workshop/ProjectCardSetupOverlay.tsx",
  "utf8",
);
const projectCardTitleBlock = readFileSync(
  "src/components/workshop/ProjectCardTitleBlock.tsx",
  "utf8",
);
const projectCardSource = [
  liveProjectCard,
  projectCardThumbnail,
  projectCardThumbnailReveal,
  projectCardFavoriteControl,
  projectCardSetupOverlay,
  projectCardTitleBlock,
].join("\n");
const projectGridLayout = readFileSync(
  "src/components/workshop/project-grid-layout.ts",
  "utf8",
);
const projectActions = readFileSync("src/lib/projects/actions.ts", "utf8");
const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");
const projectImageRoute = readFileSync(
  "src/app/api/projects/images/route.ts",
  "utf8",
);
const projectImageClient = readFileSync(
  "src/components/workshop/project-image-client.ts",
  "utf8",
);
const projectCodeUtil = readFileSync(
  "src/lib/projects/project-code.ts",
  "utf8",
);

describe("project creation UI governance", () => {
  it("uses shared Button and ControlInput primitives for the new project flow", () => {
    expect(newProjectFormSections).toContain('from "@/components/ui/button"');
    expect(newProjectFormSections).toContain(
      'from "@/components/ui/control-input"',
    );
    expect(newProjectForm).not.toContain("<button");
    expect(newProjectImagePanel).toContain('type="file"');
  });

  it("renders live Supabase project cards separately from sample references", () => {
    expect(projectsPage).toContain("ProjectsPageClient");
    expect(projectsPage).toContain("favoriteProjectIds={favoriteProjectIds}");
    expect(projectsPage).toContain("googleMapsApiKey={googleMapsApiKey}");
    expect(projectsPage).toContain("googleMapsMapId={googleMapsMapId}");
    expect(projectsPageClient).toContain("LiveProjectCard");
    expect(projectsPageClient).toContain("NewProjectModal");
    expect(projectsPageClient).toContain('from "@/hooks/use-toggle-project-favorite"');
    expect(projectsPageClient).toContain("toggleProjectFavoriteMutation.toggle(");
    expect(projectsPageClient).toContain("router.refresh()");
    expect(projectsPageClient).toContain("favoriteIds.has(item.project.id)");
    expect(projectsPageClient).toContain("PROJECT_VIEW_MODE_STORAGE_KEY");
    expect(projectsPageClient).toContain('label: "Small"');
    expect(projectsPageClient).toContain("const VIEW_SELECT_OPTIONS: DropdownSelectOption[] = PROJECT_VIEW_MODE_OPTIONS.map");
    expect(projectsPageClient).toContain('icon: <Icon size={12} weight="regular" aria-hidden="true" />');
    expect(projectsPageClient).toContain('triggerDisplay="icon"');
    expect(projectsPageClient).toContain('aria-label="View"');
    expect(projectsPageClient).toContain("data-project-view-mode={projectViewMode}");
    expect(projectsPageClient).toContain("viewMode={projectViewMode}");
    expect(liveProjectCard).toContain('project: Tables<"projects">');
    expect(liveProjectCard).toContain('viewMode?: ProjectCardViewMode;');
    expect(liveProjectCard).toContain('data-project-card-view={viewMode}');
    expect(liveProjectCard).toContain('const thumbnailAspectClass = "aspect-[4/3]"');
    expect(projectCardSource).toContain("data-project-card-thumbnail");
    expect(projectCardSource).toContain('"relative shrink-0 overflow-hidden bg-surfaceMuted"');
    expect(projectCardSource).not.toContain("aspect-square");
    expect(projectCardSource).not.toContain("aspect-[3/2]");
    expect(projectCardSource).toContain('"size-12 shrink-0 rounded-xs border border-hairline"');
    expect(projectCardSource).toContain("line-clamp-2");
    expect(projectCardSource).toContain("data-project-card-hover-reveal");
    expect(projectCardSource).toContain("aria-pressed={isFavorite}");
    expect(projectCardSource).toContain('weight="regular"');
    expect(projectCardSource).toContain("aria-pressed:border-tertiary/40 aria-pressed:bg-surfaceMuted aria-pressed:text-ink");
    expect(projectCardSource).not.toContain("h-32");
    expect(projectCardSource).not.toContain("min-h-[260px]");
    expect(projectsPageClient).toContain("getProjectGridClassName(projectViewMode)");
    expect(projectGridLayout).toContain("grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3");
  });

  it("keeps newly created projects visible while create/setup work settles", () => {
    expect(projectActions).toContain("return project");
    expect(newProjectModal).toContain("onOptimisticProjectChange");
    expect(newProjectForm).toContain("export type NewProjectOptimisticSnapshot");
    expect(newProjectForm).toContain("createOptimisticProject");
    expect(newProjectForm).toContain('reportOptimisticProject({ state: "creating", message: "Creating project..." }, true)');
    expect(newProjectForm).toContain('reportOptimisticProject({ state: "preparing", message: "Creating default estimate..." }, true)');
    expect(newProjectForm).toContain("remove: true");
    expect(newProjectForm).toContain("errorMessage: message");
    expect(newProjectForm).toContain("reportOptimisticProject({ state: \"error\", message: setupErrorMessage }, false, setupErrorMessage)");
    expect(newProjectForm).toContain('"Project was created, but setup needs attention."');
    expect(projectsPageClient).toContain("optimisticProjectCreates");
    expect(projectsPageClient).toContain("optimisticProjectSnapshotToListItem");
    expect(projectsPageClient).toContain("isOptimisticCreate: true");
    expect(projectsPageClient).toContain("optimisticProjectItemIds.has(item.project.id)");
    expect(projectsPageClient).toContain("if (snapshot.remove)");
    expect(projectsPageClient).toContain("isProjectSetupBlocking");
    expect(projectsPageClient).not.toContain('snapshot.setupStatus?.state === "error") continue');
    expect(projectsPageClient).toContain('onOptimisticProjectChange={handleOptimisticProjectChange}');
    expect(projectsPageClient).toContain("googleMapsApiKey={googleMapsApiKey}");
    expect(projectsPageClient).toContain("googleMapsMapId={googleMapsMapId}");
    expect(liveProjectCard).toContain("export type ProjectCardSetupStatus");
    expect(projectCardSource).toContain("data-project-card-setup-overlay");
    expect(liveProjectCard).toContain("data-project-card-setup-state={setupStatus?.state}");
    expect(liveProjectCard).toContain("aria-busy={setupBusy || undefined}");
    expect(liveProjectCard).toContain("setupNavigationDisabled");
  });

  it("keeps the project create action icon-only", () => {
    expect(projectsPageClient).toContain('toolbarPrefix="projects"');
    expect(projectsPageClient).toContain('label: "Add projects"');
    expect(projectsPageClient).toContain('onClick: () => dispatchPageState({ type: "setIsModalOpen", value: true })');
    expect(projectsPageClient).not.toContain("addVisibleLabel");
  });

  it("keeps project deletion copy aligned with active shared-link revocation", () => {
    expect(projectsPageClient).toContain("Active shared links will be revoked when deleted.");
    expect(projectsPageClient).not.toContain("Projects with active shared links cannot be deleted.");
  });

  it("keeps the create project modal product-facing and composed", () => {
    expect(newProjectModal).not.toContain("Live Supabase");
    expect(newProjectModal).toContain('from "@/components/ui/overlays/dialog"');
    expect(newProjectModal).toContain("DialogHeader");
    expect(newProjectModal).toContain("DialogTitle");
    expect(newProjectModal).toContain("DialogCloseButton");
    expect(newProjectModal).toContain('closeLabel="Close create project"');
    expect(newProjectModal).toContain("data-create-project-modal");
    expect(newProjectModal).toContain("data-create-project-modal-root");
    expect(newProjectModal).toContain("data-create-project-modal-tray");
    expect(newProjectModal).toContain("fixed inset-0 z-[1000] flex items-center justify-center");
    expect(newProjectModal).toContain("max-h-[calc(100dvh-2rem)]");
    expect(newProjectModal).toContain("w-[min(1380px,calc(100vw-2rem))]");
    expect(newProjectModal).toContain("workshop-create-project-modal-glass");
    expect(newProjectModal).toContain("bg-white");
    expect(newProjectModal).not.toContain("<dialog");
    expect(appGlobals).toContain(".workshop-create-project-modal-glass");
    expect(appGlobals).toContain(
      ':root[data-glass="ready"] .workshop-create-project-modal-glass',
    );
    expect(newProjectForm).toContain("showHeader = true");
    expect(newProjectForm).toContain("grid-rows-[minmax(0,1fr)_auto]");
    expect(newProjectFormSections).toContain("Projects");
    expect(newProjectForm).toContain("CreateProjectHeader");
    expect(newProjectForm).toContain("ProjectImagePanel");
    expect(newProjectForm).toContain("ProjectFields");
    expect(newProjectFormSections).toContain("ProjectCodeField");
    expect(newProjectForm).toContain("CreateProjectFooter");
    expect(newProjectForm).toContain("data-create-project-details-panel");
    expect(newProjectForm).not.toContain("Project setup");
    expect(newProjectForm).not.toContain("Details and reference");
    expect(newProjectForm).not.toContain("Capture the essentials now");
    expect(newProjectFormSections).toContain("ProjectAddressAutocomplete");
    expect(newProjectFormSections).toContain("ProjectLocationMap");
    expect(newProjectFormSections).toContain("data-create-project-location-preview");
    expect(newProjectFormSections).toMatch(/Project name[\s\S]*Client[\s\S]*<ProjectCodeField[\s\S]*Location/);
    expect(newProjectForm).toContain("saveProjectLocation");
    expect(newProjectForm).toContain("locationFormData");
    expect(newProjectForm).toContain('formData.set("geocoderName", "google")');
    expect(newProjectForm).toContain('"Project location can be refined later."');
    expect(newProjectFormSections).toContain("Project Code");
    expect(newProjectFormSections).toContain("projectCode?: string | null");
    expect(newProjectFormSections).toContain("const codeValue = projectCode ?? \"\"");
    expect(newProjectFormSections).toContain("value={codeValue}");
    expect(newProjectFormSections).toContain(
      'className="group/code-field w-full space-y-1"',
    );
    expect(newProjectFormSections).toContain("CREATE_PROJECT_FIELD_LABEL_CLASS");
    expect(newProjectFormSections).toContain(
      'className={cn(CREATE_PROJECT_INPUT_CLASS, "w-full pr-9 font-medium text-secondary")}',
    );
    expect(newProjectFormSections).toContain("opacity-0 transition-opacity group-hover/code-field:opacity-100 group-focus-within/code-field:opacity-100");
    expect(newProjectForm).toContain("grid min-h-0 gap-2 overflow-auto p-2");
    expect(newProjectForm).toContain("lg:overflow-hidden");
    expect(newProjectForm).toContain("lg:items-start");
    expect(newProjectForm).toContain("flex h-full min-h-0 flex-col");
    expect(newProjectForm).toContain("lg:self-stretch");
    expect(newProjectFormSections).toContain("data-create-project-fields");
    expect(newProjectFormSections).toContain("grid gap-2");
    expect(newProjectForm).toContain(
      "lg:grid-cols-[minmax(360px,460px)_minmax(300px,1fr)_minmax(360px,460px)]",
    );
    expect(newProjectForm).toContain('className="aspect-[4/3] h-auto"');
    expect(newProjectForm).toMatch(new RegExp("</div>\\s*<CreateProjectFooter"));
    expect(newProjectImagePanel).toContain("data-project-image-panel");
    expect(newProjectImagePanel).toContain("aspect-[4/3]");
    expect(newProjectImagePanel).not.toContain("lg:min-h-[512px]");
    expect(newProjectImagePanel).toContain("absolute inset-x-2 bottom-2");
    expect(newProjectFormSections).toContain(
      'className="border-b border-[color:var(--glass-border)] bg-white/54 px-2 py-2"',
    );
    expect(newProjectFormSections).toContain(
      "text-[12px] font-medium leading-4",
    );
    expect(newProjectFormSections).not.toContain("text-[22px]");
    expect(newProjectFormSections).toContain("h-8 bg-white/92 px-2 !text-[10px]");
    expect(newProjectFormSections).not.toContain("text-right !text-[8px]");
    expect(newProjectFormSections).not.toContain(
      "bg-surfaceMuted px-2 !text-[8px]",
    );
    expect(newProjectFormSections).not.toContain('id="new-project-location"');
    expect(newProjectFormSections).toContain('variant="brand"');
    expect(newProjectFormSections).toContain("h-8 min-w-[124px] gap-2 rounded-xs px-2");
    expect(newProjectFormSections).toContain('placeholder="A7K9M2Q4"');
    expect(newProjectForm).toContain('from "@/lib/projects/project-code"');
    expect(newProjectFormSections).toContain(
      'aria-label="Generate project code"',
    );
    expect(newProjectForm).toContain("setProjectCode(generateProjectCode())");
    expect(newProjectFormSections).toContain("min-h-[22px]");
    expect(newProjectFormSections).toContain("border-t border-hairline");
  });

  it("lets new projects select and upload an image into project metadata", () => {
    expect(newProjectImagePanel).toContain('aria-label="Upload project image"');
    expect(newProjectForm).toContain("chooseProjectImage");
    expect(newProjectForm).toContain("uploadProjectImage(");
    expect(newProjectForm).toContain("selectedImage,");
    expect(newProjectForm).toContain("project.id,");
    expect(newProjectForm).toContain(
      "updateProjectImageMetadata(project.id, uploadedImage)",
    );
    expect(newProjectForm).toContain("removeProjectImageUpload(uploadedImage)");
    expect(newProjectForm).toContain("router.refresh()");
    expect(projectActions).toContain(
      "export async function createProjectRecord",
    );
    expect(projectActions).toContain(
      "export async function updateProjectImageMetadata",
    );
    expect(projectActions).toContain("applyProjectImageMetadata");
  });

  it("does not expose internal project database ids in the details modal", () => {
    expect(projectDetailsModal).toContain(
      'name="projectId" value={project.id}',
    );
    expect(projectDetailsModal).not.toContain("Database IDs");
    expect(projectDetailsModal).not.toContain("project.workspace_id");
  });

  it("does not render a duplicate cancel action in the details modal footer", () => {
    expect(projectDetailsModal).toContain('closeLabel="Close project details"');
    expect(projectDetailsModal).not.toContain(">Cancel<");
  });

  it("uses a searchable persisted currency selector for project details", () => {
    expect(projectDetailsModal).toContain("CreatableCombobox");
    expect(projectDetailsModal).toContain(
      'name="currencyCode" value={currencyCode}',
    );
    expect(projectDetailsModal).toContain('ariaLabel="Currency"');
    expect(projectDetailsModal).toContain("allowCreate={false}");
    expect(projectDetailsModal).toContain('optionPresentation="unit"');
    expect(projectDetailsModal).toContain('dropdownPlacement="top"');
    expect(projectActions).toContain("function readCurrencyCode");
    expect(projectActions).toContain("currency_code: currencyCode");
    expect(estimateActions).toContain("currency_code: project.currency_code");
  });

  it("can auto-generate an alphanumeric project code in the details modal", () => {
    expect(projectCodeUtil).toContain(
      'const PROJECT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"',
    );
    expect(projectCodeUtil).toContain("export function generateProjectCode");
    expect(projectCodeUtil).toContain("crypto.getRandomValues");
    expect(projectDetailsModal).toContain('aria-label="Generate project code"');
    expect(projectDetailsModal).toContain(
      'dispatchDetails({ type: "generateProjectCode" })',
    );
    expect(projectDetailsModal).toContain('name="projectCode"');
    expect(projectDetailsModal).toContain(
      'dispatchDetails({ type: "projectCode", value: event.currentTarget.value })',
    );
  });

  it("uses Supabase Storage upload controls instead of a project image URL field", () => {
    expect(projectDetailsModal).toContain(
      'accept="image/jpeg,image/png,image/webp,image/avif"',
    );
    expect(projectDetailsModal).toContain('aria-label="Upload project image"');
    expect(projectDetailsModal).toContain(
      "uploadProjectImage(file, project.id",
    );
    expect(projectImageClient).toContain("XMLHttpRequest");
    expect(projectDetailsModal).toContain('name="projectImagePath"');
    expect(projectDetailsModal).toContain('name="projectImageThumbnailPath"');
    expect(projectDetailsModal).toContain('aria-label="Remove project image"');
    expect(projectDetailsModal).not.toContain("Project image URL");
    expect(projectDetailsModal).not.toContain('placeholder="https://..."');
  });

  it("persists project image storage metadata for cards and local store consumers", () => {
    expect(projectActions).toContain(
      'formData.get("projectImageRemove") === "1"',
    );
    expect(projectActions).toContain("metadata.projectImageUrl = image.url");
    expect(projectActions).toContain("metadata.projectImagePath = image.path");
    expect(projectActions).toContain(
      "metadata.projectImageThumbnailPath = image.thumbnailPath",
    );
    expect(projectActions).toContain("getProjectImageStoragePaths(metadata)");
    expect(projectActions).toContain(
      "await removeStoredProjectImagePaths(supabase, getProjectImageStoragePaths(metadata))",
    );
    expect(projectImageRoute).toContain(
      'const PROJECT_IMAGE_BUCKET = "project-images"',
    );
    expect(projectImageRoute).toContain("createProjectImageRouteUrl(path)");
    expect(projectImageRoute).toContain('formData.get("projectId"');
    expect(projectImageRoute).toContain('eq("workspace_id", workspace.id)');
    expect(projectImageRoute).toContain("${PROJECT_IMAGE_PATH_SEGMENT}/${projectId}");
    expect(projectImageRoute).toContain("sharp(sourceBuffer");
  });
});
