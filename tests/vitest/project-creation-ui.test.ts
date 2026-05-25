import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectsPage = readFileSync("src/app/workshop/projects/page.tsx", "utf8");
const projectsPageClient = readFileSync("src/components/workshop/projects-page-client.tsx", "utf8");
const newProjectModal = readFileSync("src/components/workshop/NewProjectModal.tsx", "utf8");
const projectDetailsModal = readFileSync("src/components/workshop/ProjectDetailsModal.tsx", "utf8");
const newProjectForm = readFileSync("src/components/workshop/NewProjectForm.tsx", "utf8");
const liveProjectCard = readFileSync("src/components/workshop/LiveProjectCard.tsx", "utf8");
const projectActions = readFileSync("src/lib/projects/actions.ts", "utf8");
const estimateActions = readFileSync("src/lib/estimates/actions.ts", "utf8");
const projectImageRoute = readFileSync("src/app/api/projects/images/route.ts", "utf8");
const projectImageClient = readFileSync("src/components/workshop/project-image-client.ts", "utf8");
const projectCodeUtil = readFileSync("src/lib/projects/project-code.ts", "utf8");

describe("project creation UI governance", () => {
  it("uses shared Button and ControlInput primitives for the new project flow", () => {
    expect(newProjectForm).toContain('from "@/components/ui/button"');
    expect(newProjectForm).toContain('from "@/components/ui/control-input"');
    expect(newProjectForm).not.toContain("<button");
    expect(newProjectForm).toContain('type="file"');
  });

  it("renders live Supabase project cards separately from sample references", () => {
    expect(projectsPage).toContain("ProjectsPageClient");
    expect(projectsPageClient).toContain("LiveProjectCard");
    expect(projectsPageClient).toContain("NewProjectModal");
    expect(liveProjectCard).toContain('project: Tables<"projects">');
  });

  it("keeps the project create action icon-only", () => {
    expect(projectsPageClient).toContain('toolbarPrefix="projects"');
    expect(projectsPageClient).toContain("onAdd={() => setIsModalOpen(true)}");
    expect(projectsPageClient).not.toContain("addVisibleLabel");
  });

  it("keeps the create project modal product-facing and compact", () => {
    expect(newProjectModal).not.toContain("Live Supabase");
    expect(newProjectModal).toContain(">Projects<");
    expect(newProjectModal).toContain('aria-label="Close create project"');
    expect(newProjectModal).toContain("max-w-3xl");
    expect(newProjectForm).toContain("tracking-normal");
    expect(newProjectForm).toContain('placeholder="A7K9M2Q4"');
    expect(newProjectForm).toContain('from "@/lib/projects/project-code"');
    expect(newProjectForm).toContain('aria-label="Generate project code"');
    expect(newProjectForm).toContain("setProjectCode(generateProjectCode())");
    expect(newProjectForm).toContain("border-t border-hairline");
  });

  it("lets new projects select and upload an image into project metadata", () => {
    expect(newProjectForm).toContain('aria-label="Upload project image"');
    expect(newProjectForm).toContain("chooseProjectImage");
    expect(newProjectForm).toContain("uploadProjectImage(selectedImage, project.id");
    expect(newProjectForm).toContain("updateProjectImageMetadata(project.id, uploadedImage)");
    expect(newProjectForm).toContain("removeProjectImageUpload(uploadedImage)");
    expect(newProjectForm).toContain("router.push(`/workshop/projects/${project.id}`)");
    expect(projectActions).toContain("export async function createProjectRecord");
    expect(projectActions).toContain("export async function updateProjectImageMetadata");
    expect(projectActions).toContain("applyProjectImageMetadata");
  });

  it("does not expose internal project database ids in the details modal", () => {
    expect(projectDetailsModal).toContain('name="projectId" value={project.id}');
    expect(projectDetailsModal).not.toContain("Database IDs");
    expect(projectDetailsModal).not.toContain("project.workspace_id");
  });

  it("does not render a duplicate cancel action in the details modal footer", () => {
    expect(projectDetailsModal).toContain('aria-label="Close project details"');
    expect(projectDetailsModal).not.toContain(">Cancel<");
  });

  it("uses a searchable persisted currency selector for project details", () => {
    expect(projectDetailsModal).toContain("CreatableCombobox");
    expect(projectDetailsModal).toContain('name="currencyCode" value={currencyCode}');
    expect(projectDetailsModal).toContain('ariaLabel="Currency"');
    expect(projectDetailsModal).toContain('allowCreate={false}');
    expect(projectDetailsModal).toContain('optionPresentation="unit"');
    expect(projectDetailsModal).toContain('dropdownPlacement="top"');
    expect(projectActions).toContain("function readCurrencyCode");
    expect(projectActions).toContain("currency_code: currencyCode");
    expect(estimateActions).toContain("currency_code: project.currency_code");
  });

  it("can auto-generate an alphanumeric project code in the details modal", () => {
    expect(projectCodeUtil).toContain('export const PROJECT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"');
    expect(projectCodeUtil).toContain("export function generateProjectCode");
    expect(projectCodeUtil).toContain("crypto.getRandomValues");
    expect(projectDetailsModal).toContain('aria-label="Generate project code"');
    expect(projectDetailsModal).toContain("setProjectCode(generateProjectCode())");
    expect(projectDetailsModal).toContain('name="projectCode"');
    expect(projectDetailsModal).toContain("setProjectCode(event.currentTarget.value.toUpperCase())");
  });

  it("uses Supabase Storage upload controls instead of a project image URL field", () => {
    expect(projectDetailsModal).toContain('accept="image/jpeg,image/png,image/webp,image/avif"');
    expect(projectDetailsModal).toContain('aria-label="Upload project image"');
    expect(projectDetailsModal).toContain("uploadProjectImage(file, project.id");
    expect(projectImageClient).toContain("XMLHttpRequest");
    expect(projectDetailsModal).toContain('name="projectImagePath"');
    expect(projectDetailsModal).toContain('name="projectImageThumbnailPath"');
    expect(projectDetailsModal).toContain('aria-label="Remove project image"');
    expect(projectDetailsModal).not.toContain("Project image URL");
    expect(projectDetailsModal).not.toContain('placeholder="https://..."');
  });

  it("persists project image storage metadata for cards and local store consumers", () => {
    expect(projectActions).toContain('formData.get("projectImageRemove") === "1"');
    expect(projectActions).toContain("metadata.projectImageUrl = image.url");
    expect(projectActions).toContain("metadata.projectImagePath = image.path");
    expect(projectActions).toContain("metadata.projectImageThumbnailPath = image.thumbnailPath");
    expect(projectActions).toContain("getProjectImageStoragePaths(metadata)");
    expect(projectActions).toContain("await removeStoredProjectImagePaths(supabase, getProjectImageStoragePaths(metadata))");
    expect(projectImageRoute).toContain('const PROJECT_IMAGE_BUCKET = "component-images"');
    expect(projectImageRoute).toContain('formData.get("projectId"');
    expect(projectImageRoute).toContain('eq("workspace_id", workspace.id)');
    expect(projectImageRoute).toContain("project-images/${projectId}");
    expect(projectImageRoute).toContain("sharp(sourceBuffer");
  });
});
