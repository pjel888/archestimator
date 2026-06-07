import type { ReactNode } from "react";
import {
  ArrowClockwise,
  Bell,
  CaretRight,
  CheckCircle,
  CirclesFour,
  ClipboardText,
  CurrencyCircleDollar,
  FileText,
  Gear,
  HouseLine,
  IconContext,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  ShareNetwork,
  SquaresFour,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ControlField, ControlInput, ControlTextarea } from "@/components/ui/control-input";
import { ControlSelect } from "@/components/ui/control-select";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";
import {
  formatPeso,
  makeComponentLibraryFixture,
  makeEstimateFixture,
  makeNotificationFixture,
  makeProjectFixture,
  makeShareReviewFixture,
  type StoryEstimateRow,
  type StoryNotification,
} from "../fixtures/product-fixtures";

type StoryHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

type Tone = "neutral" | "success" | "warning" | "danger";

const toneClassName: Record<Tone, string> = {
  neutral: "border-hairline bg-surfaceMuted text-ink",
  success: "border-successSoft bg-successSoft text-success",
  warning: "border-warningSoft bg-warningSoft text-warning",
  danger: "border-dangerSoft bg-dangerSoft text-danger",
};

export const semanticIcons = [
  { label: "Home", icon: HouseLine },
  { label: "Projects", icon: SquaresFour },
  { label: "Components", icon: CirclesFour },
  { label: "Estimate", icon: ClipboardText },
  { label: "Proposal", icon: FileText },
  { label: "Cost", icon: CurrencyCircleDollar },
  { label: "Share", icon: ShareNetwork },
  { label: "Search", icon: MagnifyingGlass },
  { label: "Add", icon: Plus },
  { label: "Edit", icon: PencilSimple },
  { label: "Settings", icon: Gear },
  { label: "Notifications", icon: Bell },
  { label: "Success", icon: CheckCircle },
  { label: "Warning", icon: WarningCircle },
  { label: "Error", icon: XCircle },
  { label: "Refresh", icon: ArrowClockwise },
];

export function StoryHeader({ eyebrow, title, description }: StoryHeaderProps) {
  return (
    <header className="mb-4 max-w-3xl">
      <p className="mb-1 text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary">{eyebrow}</p>
      <h1 className="text-[12px] font-medium leading-4 tracking-normal text-ink">{title}</h1>
      <p className="mt-1 text-[10px] leading-4 tracking-normal text-secondary">{description}</p>
    </header>
  );
}

export function StorySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-[11px] font-medium leading-4 text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function StoryGrid({ children, columns = "md:grid-cols-3" }: { children: ReactNode; columns?: string }) {
  return <div className={cn("grid grid-cols-1 gap-2", columns)}>{children}</div>;
}

export function StoryPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-hairline bg-white p-2", className)}>{children}</div>;
}

export function Note({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <div className={cn("border px-2 py-1.5 text-[9px] leading-4", toneClassName[tone])}>{children}</div>;
}

export function TokenSwatch({ label, value, text = "#292929" }: { label: string; value: string; text?: string }) {
  return (
    <div className="flex min-h-14 items-center gap-2 border border-hairline bg-white p-2">
      <span className="block size-8 shrink-0 border border-hairline" style={{ background: value }} />
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-medium leading-4 text-ink">{label}</span>
        <span className="block text-[9px] leading-3 text-tertiary">{value}</span>
      </span>
      <span className="ml-auto size-4 border border-hairline" style={{ background: text }} aria-hidden="true" />
    </div>
  );
}

export function TypographySpecimen() {
  const rows = [
    ["app-title", "12px", "Project estimate workspace"],
    ["app-subtitle", "11px", "Budget, scope, and shared review status"],
    ["app-body", "10px", "Line item, helper text, and control body copy"],
    ["app-label", "9px", "FORM LABEL"],
    ["app-label-sm", "8px", "Metadata and dense table hints"],
  ];

  return (
    <StoryPanel>
      {rows.map(([token, size, sample]) => (
        <div key={token} className="grid grid-cols-[92px_48px_1fr] items-baseline gap-2 border-b border-hairline py-1 last:border-b-0">
          <span className="text-[9px] leading-3 text-tertiary">{token}</span>
          <span className="text-[9px] leading-3 text-tertiary">{size}</span>
          <span className={cn("font-medium leading-4 text-ink", size === "12px" ? "text-[12px]" : size === "11px" ? "text-[11px]" : size === "8px" ? "text-[8px]" : size === "9px" ? "text-[9px]" : "text-[10px]")}>
            {sample}
          </span>
        </div>
      ))}
    </StoryPanel>
  );
}

export function IconGallery() {
  return (
    <IconContext.Provider value={{ size: 15, weight: "regular" }}>
      <StoryGrid columns="grid-cols-2 md:grid-cols-4">
        {semanticIcons.map(({ label, icon: Icon }) => (
          <StoryPanel key={label} className="flex items-center gap-2">
            <Icon className="shrink-0 text-ink" aria-hidden="true" />
            <span className="min-w-0 truncate text-[10px] font-medium leading-4 text-ink">{label}</span>
          </StoryPanel>
        ))}
      </StoryGrid>
    </IconContext.Provider>
  );
}

export function ButtonMatrix() {
  return (
    <StoryGrid columns="md:grid-cols-2">
      <StoryPanel className="space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="primary">Save estimate</Button>
          <Button variant="secondary">Review</Button>
          <Button variant="soft">Draft</Button>
          <Button variant="success">Approve</Button>
          <Button variant="warning">Flag</Button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="plain">Plain</Button>
          <Button variant="danger">Delete</Button>
        </div>
      </StoryPanel>
      <StoryPanel className="space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button size="md">MD</Button>
          <Button size="lg">LG</Button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button disabled>Disabled</Button>
          <Button aria-busy="true">Saving</Button>
          <Button className="max-w-44 truncate">Long label that truncates inside compact controls</Button>
        </div>
      </StoryPanel>
      <StoryPanel className="space-y-2">
        <div className="flex items-center gap-1">
          <Button size="icon-xs" aria-label="Quick add row"><Plus size={11} weight="regular" /></Button>
          <Button size="icon-sm" aria-label="Add row"><Plus size={12} weight="regular" /></Button>
          <Button size="icon" variant="ghost" aria-label="Edit row"><PencilSimple size={13} weight="regular" /></Button>
          <Button size="icon-lg" variant="danger" aria-label="Delete row"><XCircle size={14} weight="regular" /></Button>
        </div>
        <Note>Icon-only buttons require an accessible label and use Phosphor regular outline icons.</Note>
      </StoryPanel>
    </StoryGrid>
  );
}

export function FormControlMatrix() {
  return (
    <StoryGrid columns="md:grid-cols-2">
      <StoryPanel className="space-y-2">
        <ControlField label="Project name" helperText="Static story fixture" required>
          <ControlInput className="h-8 border-hairline px-2" defaultValue="Demo Renovation Package" />
        </ControlField>
        <ControlField label="Search" helperText="Clear button appears when controlled value exists" as="div">
          <SearchInput value="millwork" readOnly onClear={() => undefined} aria-label="Search story rows" />
        </ControlField>
      </StoryPanel>
      <StoryPanel className="space-y-2">
        <ControlField label="Status" as="div">
          <ControlSelect defaultValue="review" wrapperClassName="h-8 border border-hairline px-2">
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
          </ControlSelect>
        </ControlField>
        <ControlField label="Reviewer notes" errorText="Required before sharing">
          <ControlTextarea invalid rows={3} defaultValue="Confirm fixture-only review copy." />
        </ControlField>
      </StoryPanel>
    </StoryGrid>
  );
}

export function StatusAndChipMatrix() {
  return (
    <StoryPanel className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Badge>Draft</Badge>
        <Badge tone="success">Approved</Badge>
        <Badge tone="warning">Needs review</Badge>
        <Badge tone="danger">Blocked</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Chip active>Selected scope</Chip>
        <Chip removable>Millwork</Chip>
        <Chip tone="accent">Supplier</Chip>
        <Chip tone="danger">Over budget</Chip>
      </div>
      <Note>States use labels plus color, so status is not color-only.</Note>
    </StoryPanel>
  );
}

export function LoadingEmptyErrorMatrix() {
  return (
    <StoryGrid columns="md:grid-cols-3">
      <StoryPanel className="space-y-1">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-5 w-36" />
      </StoryPanel>
      <EmptyState title="No matching rows" description="Try removing filters or adding a component fixture." action={<Button size="sm">Add fixture</Button>} />
      <StoryPanel>
        <Note tone="danger">
          Error state: static data failed validation. Stories must not call live providers to recover.
        </Note>
      </StoryPanel>
    </StoryGrid>
  );
}

export function CompactDataTable() {
  const estimate = makeEstimateFixture();

  return (
    <StoryPanel>
      <table className="w-full border-collapse text-left text-[10px] leading-4">
        <thead className="text-[9px] font-medium text-tertiary">
          <tr className="border-b border-hairline">
            <th className="py-1 pr-2 font-medium">Item</th>
            <th className="py-1 pr-2 font-medium">Qty</th>
            <th className="py-1 pr-2 font-medium">Unit</th>
            <th className="py-1 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {estimate.rows.map((row) => (
            <EstimateRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </StoryPanel>
  );
}

function EstimateRow({ row }: { row: StoryEstimateRow }) {
  const tone = row.state === "invalid" ? "danger" : row.state === "dirty" ? "warning" : row.state === "saving" ? "neutral" : "success";

  return (
    <tr className="border-b border-hairline last:border-b-0">
      <td className="max-w-44 truncate py-1 pr-2 font-medium text-ink">{row.label}</td>
      <td className="py-1 pr-2 tabular-nums text-secondary">{row.quantity}</td>
      <td className="py-1 pr-2 text-secondary">{row.unit}</td>
      <td className="py-1 text-right tabular-nums text-ink">
        <span className="mr-1">{formatPeso(row.rate)}</span>
        {row.state ? <Badge tone={tone} size="xs">{row.state}</Badge> : null}
      </td>
    </tr>
  );
}

export function WorkshopShellPreview() {
  const project = makeProjectFixture();
  const estimate = makeEstimateFixture();

  return (
    <div className="grid min-h-96 grid-cols-1 border border-hairline bg-surface md:grid-cols-[180px_1fr]">
      <aside className="border-b border-hairline bg-surfaceMuted p-2 md:border-b-0 md:border-r">
        <div className="mb-2 text-[11px] font-medium leading-4 text-ink">ArchEstimator</div>
        {["Projects", "Components", "Templates", "Settings"].map((item, index) => (
          <div key={item} className={cn("mb-1 flex h-7 items-center gap-2 px-2 text-[10px] leading-4", index === 0 ? "bg-white text-ink" : "text-secondary")}>
            <CaretRight size={10} weight="regular" aria-hidden="true" />
            {item}
          </div>
        ))}
      </aside>
      <section className="min-w-0 p-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] leading-3 text-tertiary">{project.code}</p>
            <h2 className="truncate text-[12px] font-medium leading-4 text-ink">{project.name}</h2>
          </div>
          <Badge tone="success">{project.status}</Badge>
        </div>
        <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <MetricCard label="Estimates" value={String(project.estimateCount)} />
          <MetricCard label="Budget" value={formatPeso(project.totalCost)} />
          <MetricCard label="Review" value={estimate.status} />
        </div>
        <CompactDataTable />
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-hairline bg-white p-2">
      <div className="text-[9px] leading-3 text-tertiary">{label}</div>
      <div className="mt-1 truncate text-[11px] font-medium leading-4 text-ink">{value}</div>
    </div>
  );
}

export function DomainCardsPreview() {
  const project = makeProjectFixture();
  const components = makeComponentLibraryFixture();
  const share = makeShareReviewFixture();

  return (
    <StoryGrid columns="md:grid-cols-3">
      <StoryPanel>
        <Badge tone="success">{project.status}</Badge>
        <h3 className="mt-2 truncate text-[11px] font-medium leading-4 text-ink">{project.name}</h3>
        <p className="text-[9px] leading-3 text-tertiary">{project.code} / {project.estimateCount} estimates</p>
        <p className="mt-2 text-[10px] font-medium leading-4 text-ink">{formatPeso(project.totalCost)}</p>
      </StoryPanel>
      <StoryPanel className="space-y-1">
        {components.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 border-b border-hairline py-1 last:border-b-0">
            <span className="min-w-0 truncate text-[10px] font-medium leading-4 text-ink">{item.name}</span>
            <Badge tone={item.status === "approved" ? "success" : item.status === "needs-review" ? "warning" : "neutral"} size="xs">
              {item.status}
            </Badge>
          </div>
        ))}
      </StoryPanel>
      <StoryPanel>
        <Badge tone={share.decision === "approved" ? "success" : share.decision === "changes-requested" ? "warning" : "neutral"}>{share.decision}</Badge>
        <h3 className="mt-2 text-[11px] font-medium leading-4 text-ink">Share review panel</h3>
        <p className="mt-1 text-[9px] leading-3 text-tertiary">{share.reviewerName} / {share.commentCount} comments</p>
        <p className="mt-2 truncate text-[9px] leading-3 text-secondary">{share.tokenLabel}</p>
      </StoryPanel>
    </StoryGrid>
  );
}

export function NotificationPreview() {
  const notifications = makeNotificationFixture();

  return (
    <StoryPanel className="max-w-md space-y-1">
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
    </StoryPanel>
  );
}

function NotificationRow({ notification }: { notification: StoryNotification }) {
  const tone = notification.tone === "danger" ? "danger" : notification.tone === "warning" ? "warning" : notification.tone === "success" ? "success" : "neutral";

  return (
    <div className="flex items-start gap-2 border-b border-hairline py-2 last:border-b-0">
      <span className={cn("mt-1 block size-2 shrink-0 rounded-xs", toneClassName[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[10px] font-medium leading-4 text-ink">{notification.title}</p>
          {!notification.read ? <Badge tone="accent" size="xs">new</Badge> : null}
        </div>
        <p className="text-[9px] leading-3 text-secondary">{notification.body}</p>
      </div>
      <span className="text-[9px] leading-3 text-tertiary">{notification.timeLabel}</span>
    </div>
  );
}

export function MotionBoundaryPreview() {
  return (
    <StoryGrid columns="md:grid-cols-2">
      <StoryPanel>
        <div className="mb-2 flex h-12 items-center justify-center border border-hairline bg-surfaceMuted transition motion-reduce:transition-none">
          <span className="text-[10px] font-medium text-ink">Workshop-safe microinteraction</span>
        </div>
        <Note>CSS-only transition with `motion-reduce` fallback. No motion package required.</Note>
      </StoryPanel>
      <StoryPanel>
        <Note tone="warning">
          Landing-only expressive effects remain isolated from app/workshop stories until separate approval.
        </Note>
      </StoryPanel>
    </StoryGrid>
  );
}
