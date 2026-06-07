import type { Meta, StoryObj } from "@storybook/react";

import {
  categorySummary,
  inventoryRows,
  p0InventoryRows,
  p0StoryRows,
  p1InventoryRows,
  p1StoryRows,
  storybookImplementationEvidence,
  storyCoverageRows,
  type StoryCoverageRow,
} from "../lib/storybook-plan-matrix";
import { Badge } from "@/components/ui/badge";
import { Note, StoryHeader, StoryPanel, StorySection } from "../ui-library/story-canvas";

function StoryCoverageDashboard() {
  return <ActualStandaloneCoverageContent />;
}

const meta = {
  title: "Governance/StoryCoverageDashboard",
  component: StoryCoverageDashboard,
  parameters: {
    archestimator: {
      storybookContract: "governance",
    },
    docs: {
      description: {
        component:
          "Governance dashboard for the canonical 809-row component inventory and 703-row P0/P1 Storybook manifest. Actual standalone story implementation is verified separately by `bun run storybook:check-components`.",
      },
    },
  },
} satisfies Meta<typeof StoryCoverageDashboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActualStandaloneCoverage: Story = {
  render: () => <ActualStandaloneCoverageContent />,
};

export const ManifestCoverageDashboard: Story = ActualStandaloneCoverage;

export const PlanBacklogDistinction: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 governance"
        title="Plan rows are backlog, not implemented stories"
        description="The 809 inventory rows and 703 story rows remain useful planning data, but the executable coverage check reads actual story files and exports."
      />
      <StoryPanel className="space-y-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Metric label="Planned inventory" value={String(inventoryRows.length)} />
          <Metric label="Planned story rows" value={String(storyCoverageRows.length)} />
          <Metric label="Actual verifier" value="storybook:check-components" />
        </div>
        <Note>Required standalone entries fail the build-time check if actual `.stories` files or exports are missing.</Note>
      </StoryPanel>
    </>
  ),
};

function ActualStandaloneCoverageContent() {
  return (
    <>
      <StoryHeader
        eyebrow="P0 governance"
        title="Storybook coverage dashboard"
        description="This story imports the canonical plan matrices as static markdown backlog evidence. It does not count plan rows as implemented Storybook stories."
      />
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Inventory rows" value={String(inventoryRows.length)} />
        <Metric label="P0 inventory" value={String(p0InventoryRows.length)} />
        <Metric label="P1 inventory" value={String(p1InventoryRows.length)} />
        <Metric label="Story rows" value={String(storyCoverageRows.length)} />
      </div>
      <StorySection title="Implementation evidence">
        <StoryPanel className="space-y-1">
          <div className="flex items-start gap-2 text-[10px] leading-4 text-ink">
            <Badge tone="info" size="xs">VERIFY</Badge>
            <span>Actual standalone component entries are checked by `bun run storybook:check-components`, not by this matrix row count.</span>
          </div>
          {storybookImplementationEvidence.map((item) => (
            <div key={item} className="flex items-start gap-2 text-[10px] leading-4 text-ink">
              <Badge tone="success" size="xs">MVP</Badge>
              <span>{item}</span>
            </div>
          ))}
        </StoryPanel>
      </StorySection>
      <StorySection title="Category summary">
        <StoryPanel>
          <table className="w-full border-collapse text-left text-[10px] leading-4">
            <thead className="text-[9px] text-tertiary">
              <tr className="border-b border-hairline">
                <th className="py-1 pr-2 font-medium">Category</th>
                <th className="py-1 pr-2 font-medium">P0</th>
                <th className="py-1 pr-2 font-medium">P1</th>
                <th className="py-1 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary(inventoryRows).map((row) => (
                <tr key={row.category} className="border-b border-hairline last:border-b-0">
                  <td className="py-1 pr-2 text-ink">{row.category}</td>
                  <td className="py-1 pr-2 tabular-nums text-secondary">{row.p0}</td>
                  <td className="py-1 pr-2 tabular-nums text-secondary">{row.p1}</td>
                  <td className="py-1 tabular-nums text-secondary">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </StoryPanel>
      </StorySection>
    </>
  );
}

export const P0FirstReviewRows: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 governance"
        title="P0 first-review manifest rows"
        description="Every P0_FIRST_REVIEW row from the canonical story coverage matrix is visible here."
      />
      <StoryRowTable rows={p0StoryRows} />
    </>
  ),
};

export const P1PreMigrationRows: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 governance"
        title="P1 pre-migration manifest rows"
        description="Every P1_PRE_MIGRATION row remains Storybook-only and migration-deferred until Philip approves a later route plan."
      />
      <StoryRowTable rows={p1StoryRows} />
      <StorySection title="Migration boundary">
        <Note>Storybook approval is not production migration approval. Route migration remains blocked by the plan pack.</Note>
      </StorySection>
    </>
  ),
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <StoryPanel>
      <div className="text-[9px] leading-3 text-tertiary">{label}</div>
      <div className="mt-1 text-[12px] font-medium leading-4 text-ink">{value}</div>
    </StoryPanel>
  );
}

function StoryRowTable({ rows }: { rows: StoryCoverageRow[] }) {
  return (
    <StoryPanel className="overflow-hidden">
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[10px] leading-4">
          <thead className="sticky top-0 bg-white text-[9px] text-tertiary">
            <tr className="border-b border-hairline">
              <th className="py-1 pr-2 font-medium">Story ID</th>
              <th className="py-1 pr-2 font-medium">Component</th>
              <th className="py-1 pr-2 font-medium">Title path</th>
              <th className="py-1 pr-2 font-medium">States</th>
              <th className="py-1 pr-2 font-medium">Fixture</th>
              <th className="py-1 font-medium">Plan status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.storyId} className="border-b border-hairline last:border-b-0">
                <td className="py-1 pr-2 font-medium text-ink">{row.storyId}</td>
                <td className="py-1 pr-2 text-secondary">{row.componentId}</td>
                <td className="max-w-72 truncate py-1 pr-2 text-ink">{row.titlePath}</td>
                <td className="max-w-64 truncate py-1 pr-2 text-secondary">{row.requiredStates}</td>
                <td className="max-w-48 truncate py-1 pr-2 text-secondary">{row.fixtureNeeded}</td>
                <td className="py-1">
                  <Badge tone={row.status === "NOT_STARTED" ? "warning" : "success"} size="xs">{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StoryPanel>
  );
}
