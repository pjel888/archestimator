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
const liveProjectCard = readFileSync(
  "src/components/workshop/LiveProjectCard.tsx",
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
    expect(projectsPageClient).toContain("LiveProjectCard");
    expect(projectsPageClient).toContain("NewProjectModal");
    expect(projectsPageClient).toContain('from "@/lib/workshop/actions"');
    expect(projectsPageClient).toContain("setProjectFavorite({ projectId, favorite: nextFavorite })");
    expect(projectsPageClient).toContain("router.refresh()");
    expect(projectsPageClient).toContain("favoriteIds.has(item.project.id)");
    expect(projectsPageClient).toContain("PROJECT_VIEW_MODE_STORAGE_KEY");
    expect(projectsPageClient).toContain('label: "Small thumbnails"');
    expect(projectsPageClient).toContain("label: `View projects as ${option.label}`");
    expect(projectsPageClient).toContain("data-project-view-mode={projectViewMode}");
    expect(projectsPageClient).toContain("viewMode={projectViewMode}");
    expect(liveProjectCard).toContain('project: Tables<"projects">');
    expect(liveProjectCard).toContain('viewMode?: ProjectCardViewMode;');
    expect(liveProjectCard).toContain('data-project-card-view={viewMode}');
    expect(liveProjectCard).toContain('viewMode === "large" ? "aspect-square"');
    expect(liveProjectCard).toContain('"h-auto w-28 shrink-0 border-r border-hairline sm:w-32"');
    expect(liveProjectCard).toContain("line-clamp-3");
    expect(liveProjectCard).toContain("absolute left-2 top-2");
    expect(liveProjectCard).toContain("aria-pressed={isFavorite}");
    expect(liveProjectCard).toContain('weight="regular"');
    expect(liveProjectCard).toContain("text-orange-600");
    expect(liveProjectCard).not.toContain("h-32");
    expect(liveProjectCard).not.toContain("min-h-[260px]");
    expect(projectsPageClient).toContain("2xl:grid-cols-5");
  });

  it("keeps the project create action icon-only", () => {
    expect(projectsPageClient).toContain('toolbarPrefix="projects"');
    expect(projectsPageClient).toContain('label: "Add projects"');
    expect(projectsPageClient).toContain("onClick: () => setIsModalOpen(true)");
    expect(projectsPageClient).not.toContain("addVisibleLabel");
  });

  it("keeps the create project modal product-facing and composed", () => {
    expect(newProjectModal).not.toContain("Live Supabase");
    expect(newProjectModal).toContain('aria-label="Close create project"');
    expect(newProjectModal).toContain("max-w-5xl");
    expect(newProjectModal).toContain("rounded-xs");
    expect(newProjectModal).toContain("bg-black/25 p-2");
    expect(newProjectModal).toContain("absolute right-2 top-2");
    expect(newProjectForm).toContain("grid min-h-[560px] grid-rows-[auto_1fr]");
    expect(newProjectFormSections).toContain("Projects");
    expect(newProjectForm).toContain("CreateProjectHeader");
    expect(newProjectForm).toContain("ProjectImagePanel");
    expect(newProjectForm).toContain("ProjectCodeField");
    expect(newProjectForm).toContain("ProjectFields");
    expect(newProjectForm).toContain("CreateProjectFooter");
    expect(newProjectFormSections).toContain("Project Code");
    expect(newProjectFormSections).toContain(
      'className="mt-auto w-full space-y-1.5"',
    );
    expect(newProjectFormSections).toContain("block text-right text-[8px]");
    expect(newProjectFormSections).toContain(
      "h-8 min-w-0 flex-1 bg-white px-2 text-right !text-[8px] text-tertiary",
    );
    expect(newProjectForm).toContain("flex flex-1 flex-col gap-2 p-2");
    expect(newProjectForm).toContain("grid gap-2 md:grid-cols-2");
    expect(newProjectForm).toContain(
      "lg:grid-cols-[minmax(320px,0.92fr)_minmax(460px,1fr)]",
    );
    expect(newProjectImagePanel).toContain("lg:min-h-[504px]");
    expect(newProjectImagePanel).toContain("absolute inset-x-2 bottom-2");
    expect(newProjectFormSections).toContain(
      'className="border-b border-hairline bg-white p-2"',
    );
    expect(newProjectFormSections).toContain(
      "text-[12px] font-medium leading-4",
    );
    expect(newProjectFormSections).not.toContain("text-[22px]");
    expect(newProjectFormSections).toContain("h-10 px-2 !text-[12px]");
    expect(newProjectFormSections).toContain("text-right !text-[8px]");
    expect(newProjectFormSections).not.toContain(
      "bg-surfaceMuted px-2 !text-[8px]",
    );
    expect(newProjectFormSections).toContain(
      "bg-orange-600 px-3 hover:bg-orange-700 focus-visible:ring-orange-200",
    );
    expect(newProjectFormSections).toContain('placeholder="A7K9M2Q4"');
    expect(newProjectForm).toContain('from "@/lib/projects/project-code"');
    expect(newProjectFormSections).toContain(
      'aria-label="Generate project code"',
    );
    expect(newProjectForm).toContain("setProjectCode(generateProjectCode())");
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
    expect(projectDetailsModal).toContain('aria-label="Close project details"');
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
      'export const PROJECT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"',
    );
    expect(projectCodeUtil).toContain("export function generateProjectCode");
    expect(projectCodeUtil).toContain("crypto.getRandomValues");
    expect(projectDetailsModal).toContain('aria-label="Generate project code"');
    expect(projectDetailsModal).toContain(
      "setProjectCode(generateProjectCode())",
    );
    expect(projectDetailsModal).toContain('name="projectCode"');
    expect(projectDetailsModal).toContain(
      "setProjectCode(event.currentTarget.value.toUpperCase())",
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
