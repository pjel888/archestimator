import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircle, ImageSquare, Plus, SignOut, UploadSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTROL_INPUT_SURFACE_CLASS, ControlField, ControlInput, ControlTextarea } from "@/components/ui/control-input";
import { AppModal } from "@/components/ui/overlays/modal";
import { WorkshopSettingsModalContentView } from "@/components/workshop/WorkshopSettingsModalContentView";
import { cn } from "@/lib/ui/cn";
import { formatPeso, makeComponentLibraryFixture } from "../../fixtures/product-fixtures";
import { Note, StoryGrid, StoryPanel } from "../../ui-library/story-canvas";

type ModalPattern = "settings" | "create-component";

const variantTabs = ["Variant 1", "Alternate finish"] as const;
const treeItems = ["All components", "Millwork", "Finishes", "Furniture", "Lighting"] as const;

const settingsAuditSteps = [
  {
    health: "Improved: persistent rail plus default Profile page",
    image: "/storybook-audits/settings-modal-audit-desktop.png",
    name: "Desktop Settings rail",
    notes:
      "The modal now opens with Profile selected by default. The side rail stays visible and uses compact single-line labels.",
  },
  {
    health: "Improved: selected detail without losing navigation",
    image: "/storybook-audits/settings-modal-audit-mobile.png",
    name: "Narrow selected setting",
    notes:
      "The selected Workspace setting updates the right panel while the rail stays in place, so users can switch pages without backing out.",
  },
] as const;

const settingsAuditFindings = [
  {
    evidence: "The modal starts with Profile selected in a persistent grouped rail instead of hiding navigation after selection.",
    fix: "Keep this rail/detail model as the canonical navigation-modal pattern.",
    severity: "Strength",
    title: "Settings now keeps navigation persistent",
  },
  {
    evidence: "Rows now use a plain icon and one-line title with no icon chip background, helper-text overflow, nested section card, or trailing decoration.",
    fix: "Use this row shape for future settings and lightweight navigation modals.",
    severity: "Strength",
    title: "The settings links are visually simpler",
  },
  {
    evidence: "Detail pages expose an `Open page` route link, while the modal itself also contains a preview/detail state.",
    fix: "Decide whether production settings should be modal-only previews, full route pages, or the rail/detail modal plus route handoff used here.",
    severity: "P2",
    title: "Route ownership should be made explicit",
  },
  {
    evidence: "Initial modal focus can now land on the modal content instead of the close button, and the selected row stays in the same tab order.",
    fix: "Confirm the final keyboard order in the real app shell after the production routes exist.",
    severity: "P2",
    title: "Keyboard order is improved but still needs real-route proof",
  },
  {
    evidence: "Screenshots and Storybook probes confirm visible hierarchy, but not full screen-reader announcement order or every production route.",
    fix: "Keep checking Tab loop, Escape behavior, focus return, 200 percent zoom, and route-level screen-reader names.",
    severity: "Limit",
    title: "Storybook proof is strong but not a complete accessibility audit",
  },
] as const;

function StaticSignOutControl() {
  return (
    <Button variant="danger" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => undefined}>
      <SignOut className="size-3" aria-hidden="true" />
      Sign out
    </Button>
  );
}

function SettingsPatternModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Manage account, workspace, and beta operations."
      closeLabel="Close settings"
      className="max-w-[920px]"
      bodyClassName="bg-white p-0"
      initialFocus="content"
      location="Workshop / Modal patterns / Settings"
    >
      <WorkshopSettingsModalContentView canManagePlatform renderSignOutControl={() => <StaticSignOutControl />} />
    </AppModal>
  );
}

function ComponentModalImageRail() {
  return (
    <aside className="min-h-0 overflow-auto border-b border-hairline bg-white p-3 lg:border-b-0 lg:border-r" aria-label="Component image">
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-xs border border-dashed border-divider bg-white text-tertiary">
          <div className="grid justify-items-center gap-1 px-3 text-center">
            <ImageSquare size={34} weight="regular" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-4 text-ink">Thumbnail</span>
            <span className="max-w-48 text-[9px] font-medium leading-3 text-tertiary">
              Upload a square reference image for this component.
            </span>
          </div>
        </div>
        <div className="grid gap-1">
          <span className="block min-h-3 truncate text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
            Upload thumbnail
          </span>
          <Button variant="secondary" size="sm" className="w-full">
            <UploadSimple size={12} weight="regular" aria-hidden="true" />
            Choose image
          </Button>
          <label className="flex min-h-6 items-center gap-2 rounded-xs px-1 text-[10px] font-medium normal-case tracking-normal text-ink">
            <input type="checkbox" className="size-3 rounded-xs border-hairline accent-ink" defaultChecked />
            <span>Use same image for all variants</span>
          </label>
          <span className="text-[9px] normal-case leading-3 tracking-normal text-tertiary">
            JPG, PNG, WebP, or AVIF. Large files are converted before storage.
          </span>
        </div>
      </div>
    </aside>
  );
}

function ComponentModalForm() {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-hairline bg-white px-3 py-2" aria-label="Selected nesting path">
        <div className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Nest component under</div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 pl-2 text-[10px] leading-4">
          {["All components", "Millwork", "Cabinetry"].map((segment, index) => (
            <span key={segment} className="inline-flex min-w-0 items-center gap-1">
              {index > 0 ? <span className="font-normal text-tertiary">/</span> : null}
              <span className={cn("max-w-[20rem] truncate", index === 2 ? "font-medium text-ink" : "font-normal text-tertiary")}>{segment}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <section className="grid gap-2" aria-label="Component details">
          <div className="grid gap-x-2 gap-y-3 md:grid-cols-2" aria-label="Component information fields">
            <ControlField label="Name" className="md:col-span-2">
              <ControlInput defaultValue="Laminate cabinet carcass" className={CONTROL_INPUT_SURFACE_CLASS} />
            </ControlField>
            <ControlField label="Brand" className="md:col-span-2">
              <ControlInput defaultValue="Storyline Millwork" className={CONTROL_INPUT_SURFACE_CLASS} />
            </ControlField>
            <ControlField label="Supplier" className="md:col-span-2">
              <ControlInput defaultValue="Story Supplier" className={CONTROL_INPUT_SURFACE_CLASS} />
            </ControlField>

            <div className="md:col-span-2 rounded-xs border border-hairline bg-white" aria-label="Component variants">
              <div className="flex h-8 items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label="Component variants">
                {variantTabs.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={index === 0}
                    className={cn(
                      "relative h-full min-w-0 max-w-32 rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      index === 0
                        ? "z-10 -mb-px border-hairline bg-white text-ink"
                        : "border-transparent bg-surfaceMuted text-tertiary hover:border-hairline hover:text-ink",
                    )}
                  >
                    <span className="block truncate">{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Add variant"
                  className="ml-auto grid size-8 place-items-center border-l border-hairline text-tertiary transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Plus size={12} weight="regular" aria-hidden="true" />
                </button>
              </div>
              <div role="tabpanel" aria-label="Variant 1" className="grid gap-3 p-3">
                <div className="grid gap-x-2 gap-y-3 md:grid-cols-[minmax(0,1fr)_8.5rem]">
                  <ControlField label="Variant name">
                    <ControlInput defaultValue="Variant 1" className={CONTROL_INPUT_SURFACE_CLASS} />
                  </ControlField>
                  <Button variant="secondary" size="sm" disabled className="min-h-8 w-24 self-end justify-self-end px-2">
                    Default
                  </Button>
                  <ControlField label="SKU / Reference">
                    <ControlInput defaultValue="CAB-LAM-001" className={CONTROL_INPUT_SURFACE_CLASS} />
                  </ControlField>
                  <ControlField label="Cost" className="md:col-span-2">
                    <ControlInput defaultValue="7,400.00" align="right" className={cn(CONTROL_INPUT_SURFACE_CLASS, "tabular-nums")} />
                  </ControlField>
                  <ControlField label="Unit">
                    <ControlInput defaultValue="lm" className={CONTROL_INPUT_SURFACE_CLASS} />
                  </ControlField>
                  <ControlField label="Confidence">
                    <ControlInput defaultValue="High" className={CONTROL_INPUT_SURFACE_CLASS} />
                  </ControlField>
                  <div className="md:col-span-2 rounded-xs border border-hairline bg-white p-3" aria-label="Component measurements">
                    <div className="text-[9px] font-medium uppercase tracking-normal text-tertiary">Measurements</div>
                    <div className="mt-2 grid gap-x-2 gap-y-3 md:grid-cols-4">
                      {["Length", "Width", "Height", "Dimension unit"].map((label, index) => (
                        <ControlField key={label} label={label}>
                          <ControlInput defaultValue={index === 3 ? "m" : index === 0 ? "2.4" : ""} className={CONTROL_INPUT_SURFACE_CLASS} />
                        </ControlField>
                      ))}
                    </div>
                  </div>
                  <ControlField label="Description" className="md:col-span-2">
                    <ControlTextarea defaultValue="Cabinet carcass allowance for workshop estimates." className="min-h-16" />
                  </ControlField>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ComponentModalTreeRail() {
  const components = makeComponentLibraryFixture();

  return (
    <aside className="flex min-h-0 flex-col border-t border-hairline bg-white lg:border-l lg:border-t-0" aria-label="Component nesting">
      <header className="border-b border-hairline px-3 py-2">
        <div className="text-[10px] font-medium leading-4 text-ink">Library placement</div>
        <div className="text-[9px] leading-3 text-tertiary">Static Storybook fixture</div>
      </header>
      <div className="grid gap-1 p-2">
        {treeItems.map((item, index) => (
          <button
            key={item}
            type="button"
            aria-pressed={index === 2}
            className={cn(
              "flex min-h-8 items-center justify-between gap-2 rounded-xs px-2 text-left text-[10px] font-medium leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              index === 2 ? "bg-accentSoft text-ink" : "text-secondary hover:bg-surfaceMuted hover:text-ink",
            )}
          >
            <span className="truncate">{item}</span>
            <span className="text-[9px] text-tertiary">{index === 0 ? components.length : index}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-hairline p-2">
        <div className="rounded-xs border border-hairline bg-surfaceMuted p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Default cost</span>
            <Badge tone="success" size="xs" className="min-w-0">High</Badge>
          </div>
          <div className="mt-2 text-[12px] font-medium leading-4 text-ink tabular-nums">{formatPeso(7400)} / lm</div>
        </div>
      </div>
    </aside>
  );
}

function CreateComponentPatternModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Component"
      description="Create a persisted, versioned library component."
      closeLabel="Close add component modal"
      className="max-w-7xl"
      bodyClassName="p-0"
      location="Workshop / Component library / Add Component"
    >
      <div className="flex h-[78dvh] min-h-[560px] max-h-[760px] flex-col">
        <div className="shrink-0 border-b border-hairline bg-white">
          <div className="flex h-9 items-end px-3">
            {["Component", "Activity"].map((label, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={index === 0}
                className={cn(
                  "h-8 rounded-xs border border-b-0 px-3 text-[10px] font-medium leading-none",
                  index === 0 ? "-mb-px border-hairline bg-white text-ink" : "border-transparent text-tertiary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[408px_minmax(0,1fr)_304px]">
          <ComponentModalImageRail />
          <ComponentModalForm />
          <ComponentModalTreeRail />
        </div>
        <div className="sticky bottom-0 z-10 flex min-h-11 items-center justify-end gap-2 border-t border-hairline bg-white px-3 py-2">
          <div className="mr-auto">
            <Note>Fixture only: no uploads, folders, or save action run in Storybook.</Note>
          </div>
          <Button type="button" variant="primary" size="sm">
            Add Component
          </Button>
        </div>
      </div>
    </AppModal>
  );
}

function ModalPatternLauncher({ pattern }: { pattern: ModalPattern }) {
  const [open, setOpen] = useState(false);
  const isSettings = pattern === "settings";

  return (
    <StoryPanel className="min-h-64 space-y-2">
      <div>
        <h3 className="text-[12px] font-medium leading-4 text-ink">{isSettings ? "Settings modal" : "Create Component modal"}</h3>
        <p className="mt-1 max-w-[62ch] text-[10px] leading-4 text-tertiary">
          {isSettings
            ? "Best current shell for settings navigation: stable side rail, default Profile page, and provider-free content review."
            : "Best current dense editor reference: image rail, edit body, placement rail, and sticky commit bar."}
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        Open {isSettings ? "settings" : "create component"}
      </Button>
      {isSettings ? (
        <SettingsPatternModal open={open} onOpenChange={setOpen} />
      ) : (
        <CreateComponentPatternModal open={open} onOpenChange={setOpen} />
      )}
    </StoryPanel>
  );
}

function ModalStandardsComparison() {
  return (
    <StoryGrid columns="lg:grid-cols-2">
      <StoryPanel className="space-y-2">
        <h3 className="text-[12px] font-medium leading-4 text-ink">Settings standard</h3>
        <ul className="grid gap-1 text-[10px] leading-4 text-tertiary">
          <li>Side navigation stays visible for stable categories.</li>
          <li>The right panel starts on Profile, then changes when a setting is selected.</li>
          <li>Rows use one title and one plain icon, with no horizontal scrolling.</li>
          <li>Content is now provider-free for Storybook review.</li>
        </ul>
      </StoryPanel>
      <StoryPanel className="space-y-2">
        <h3 className="text-[12px] font-medium leading-4 text-ink">Dense editor standard</h3>
        <ul className="grid gap-1 text-[10px] leading-4 text-tertiary">
          <li>Left rail for visual asset context.</li>
          <li>Center column owns data entry and validation rhythm.</li>
          <li>Right rail owns placement, scope, or inspector context.</li>
        </ul>
      </StoryPanel>
      <div className="lg:col-span-2">
        <Note>
          Recommendation: use Settings as the canonical rail/detail navigation modal pattern, and use Create Component as the canonical high-density editor pattern. Avoid copying the production Create Component modal into Storybook directly because it owns uploads, server actions, and mutation state.
        </Note>
      </div>
    </StoryGrid>
  );
}

function SettingsModalAuditReview() {
  return (
    <div className="space-y-3">
      <StoryGrid columns="lg:grid-cols-2">
        {settingsAuditSteps.map((step, index) => (
          <StoryPanel key={step.name} className="space-y-2">
            <div>
              <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Step {index + 1}</p>
              <h3 className="mt-1 text-[12px] font-medium leading-4 text-ink">{step.name}</h3>
              <p className="mt-1 text-[10px] font-medium leading-4 text-secondary">{step.health}</p>
            </div>
            <img
              src={step.image}
              alt={`${step.name} audit capture`}
              className="w-full rounded-xs border border-hairline bg-white"
            />
            <p className="text-[10px] leading-4 text-tertiary">{step.notes}</p>
          </StoryPanel>
        ))}
      </StoryGrid>

      <StoryPanel className="space-y-2">
        <div>
          <h3 className="text-[12px] font-medium leading-4 text-ink">Audit findings</h3>
          <p className="mt-1 max-w-[78ch] text-[10px] leading-4 text-tertiary">
            Scope: current Storybook Settings modal only. Evidence comes from fresh desktop and narrow viewport captures saved in
            <span className="font-medium text-secondary"> public/storybook-audits</span>.
          </p>
        </div>
        <div className="grid gap-2">
          {settingsAuditFindings.map((finding) => {
            const supportive = finding.severity === "Strength";
            return (
              <article key={finding.title} className="grid gap-1 border border-hairline bg-white p-2">
                <div className="flex items-start gap-2">
                  {supportive ? (
                    <CheckCircle size={14} weight="regular" className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <WarningCircle size={14} weight="regular" className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                      <Badge tone={supportive ? "success" : finding.severity === "Limit" ? "neutral" : "warning"} size="xs">
                        {finding.severity}
                      </Badge>
                      <h4 className="min-w-0 text-[11px] font-medium leading-4 text-ink">{finding.title}</h4>
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-secondary">
                      <span className="font-medium text-ink">Evidence: </span>
                      {finding.evidence}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-tertiary">
                      <span className="font-medium text-secondary">Recommendation: </span>
                      {finding.fix}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </StoryPanel>

      <StoryGrid columns="lg:grid-cols-3">
        <StoryPanel className="space-y-1">
          <h3 className="text-[11px] font-medium leading-4 text-ink">What feels done</h3>
          <ul className="grid gap-1 text-[10px] leading-4 text-tertiary">
            <li>White modal surface is simple and consistent with DESIGN.md tokens.</li>
            <li>Separate close chrome, title header, body, and location footer remain legible.</li>
            <li>Rows use compact title/icon structure with less decoration.</li>
            <li>Each setting updates the right panel without removing the side rail.</li>
          </ul>
        </StoryPanel>
        <StoryPanel className="space-y-1">
          <h3 className="text-[11px] font-medium leading-4 text-ink">Next fixes</h3>
          <ol className="grid list-decimal gap-1 pl-4 text-[10px] leading-4 text-tertiary">
            <li>Decide whether full route pages duplicate or replace modal detail content.</li>
            <li>Add final route-level focus and screen-reader checks.</li>
            <li>Consider syncing footer breadcrumbs to the selected detail page.</li>
          </ol>
        </StoryPanel>
        <StoryPanel className="space-y-1">
          <h3 className="text-[11px] font-medium leading-4 text-ink">Not proven by screenshots</h3>
          <ul className="grid gap-1 text-[10px] leading-4 text-tertiary">
            <li>Full keyboard trap and tab sequence.</li>
            <li>Screen-reader announcement order.</li>
            <li>200 percent zoom and long localized labels.</li>
            <li>Measured color contrast for every state.</li>
          </ul>
        </StoryPanel>
      </StoryGrid>
    </div>
  );
}

function ModalPatternsPreview() {
  return <ModalStandardsComparison />;
}

const meta = {
  title: "Domain/Workshop/ModalPatterns",
  component: ModalPatternsPreview,
  parameters: {
    archestimator: {
      storybookContract: "fixture-only",
    },
    docs: {
      description: {
        component:
          "Storybook review surface for the workshop modal standards: Settings as the navigation modal pattern and Create Component as the dense editor modal pattern. Fixtures do not call route actions, uploads, repositories, or provider state.",
      },
    },
  },
} satisfies Meta<typeof ModalPatternsPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StandardsComparison: Story = {
  render: () => <ModalStandardsComparison />,
};

export const SettingsModal: Story = {
  render: () => <ModalPatternLauncher pattern="settings" />,
};

export const SettingsModalAudit: Story = {
  name: "Settings Modal Audit",
  render: () => <SettingsModalAuditReview />,
};

export const CreateComponentModal: Story = {
  render: () => <ModalPatternLauncher pattern="create-component" />,
};
