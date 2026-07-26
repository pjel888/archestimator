"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminOverviewStrip, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminStatusSelect } from "@/components/admin/AdminStatusSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CONTROL_INPUT_SURFACE_CLASS,
  ControlField,
  ControlInput,
  ControlTextarea,
} from "@/components/ui/control-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";
import {
  createClosedBetaAllowlistEntries,
  updateClosedBetaAllowlistEntry,
  type ClosedBetaAllowlistActionResult,
} from "@/lib/auth/beta-allowlist-admin-actions";
import { formatAdminDateTime } from "@/lib/admin/datetime";

const ALLOWLIST_PATH = "/admin/allowlist";
const MAX_BULK_EMAILS = 50;

export type AdminAllowlistStatus = "invited" | "active" | "revoked";

export type AdminAllowlistRow = {
  id: string;
  normalized_email: string;
  status: AdminAllowlistStatus;
  notes: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  invite_email_sent_at: string | null;
};

export type AdminAllowlistNotice = {
  tone: "success" | "error";
  text: string;
} | null;

type AdminAllowlistManagerProps = {
  authorized: boolean;
  error: string | null;
  rows: AdminAllowlistRow[];
  counts: Record<AdminAllowlistStatus, number> & { total: number };
  statusFilter: string;
  notice: AdminAllowlistNotice;
};

type AllowlistActionResultHandler = (result: ClosedBetaAllowlistActionResult) => void;
type AllowlistActionFailureHandler = () => void;
type AllowlistRowActionsProps = {
  row: AdminAllowlistRow;
  mobile?: boolean;
  onResult: AllowlistActionResultHandler;
  onFailure: AllowlistActionFailureHandler;
};

const statusLabels: Record<AdminAllowlistStatus, string> = {
  invited: "Invited",
  active: "Active",
  revoked: "Revoked",
};

const statusTone: Record<AdminAllowlistStatus, "warning" | "success" | "danger"> = {
  invited: "warning",
  active: "success",
  revoked: "danger",
};

const statusOptions = (Object.keys(statusLabels) as AdminAllowlistStatus[]).map((status) => ({
  value: status,
  label: statusLabels[status],
}));

const filterOptions = [
  { value: "", label: "All" },
  ...statusOptions,
] as const;

/** UI preview only — server `parseClosedBetaAllowlistEmails` remains authoritative. */
function previewAllowlistEmails(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || !email.includes("@") || email.length > 320 || email.includes(" ") || seen.has(email)) {
      continue;
    }
    seen.add(email);
    emails.push(email);
    if (emails.length >= MAX_BULK_EMAILS) break;
  }
  return emails;
}

function AddSubmitButton({ readyCount }: { readyCount: number }) {
  const { pending } = useFormStatus();
  const label =
    readyCount > 1 ? `Add ${readyCount} emails` : readyCount === 1 ? "Add email" : "Add to allowlist";
  return (
    <Button
      type="submit"
      variant="primary"
      size="xs"
      disabled={pending}
      className="min-h-10 w-full sm:min-h-8 sm:w-auto sm:min-w-[7.5rem]"
    >
      {pending ? "Adding…" : label}
    </Button>
  );
}

function RowSaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      size="xs"
      disabled={pending}
      className="min-h-10 w-full sm:min-h-7 sm:w-auto sm:min-w-[4.5rem]"
    >
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function AllowlistAddForm({ onResult, onFailure }: { onResult: AllowlistActionResultHandler; onFailure: AllowlistActionFailureHandler }) {
  const [emailsText, setEmailsText] = useState("");
  const preview = useMemo(() => previewAllowlistEmails(emailsText), [emailsText]);

  return (
    <section className="rounded-xs border border-hairline bg-white p-2" aria-labelledby="allowlist-add-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="allowlist-add-heading" className="text-[11px] font-medium leading-4 text-ink">
            Add emails
          </h2>
          <p className="mt-0.5 text-[10px] leading-4 text-tertiary">
            Paste one or many addresses. Separators: comma, space, semicolon, or new line. Each new invite gets a beta thank-you email.
          </p>
        </div>
        <Badge tone="neutral" size="xs" className="min-w-0 px-1 normal-case">
          {preview.length}/{MAX_BULK_EMAILS} ready
        </Badge>
      </div>

      <form
        action={async (formData) => {
          try {
            const result = await createClosedBetaAllowlistEntries(formData);
            onResult(result);
            if (result.ok) setEmailsText("");
          } catch {
            onFailure();
          }
        }}
        className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,1fr)] lg:items-start"
      >
        <ControlField
          label="Emails"
          required
          controlId="admin-allowlist-emails"
          helperText={
            preview.length === 0
              ? "Example: reviewer@firm.com, partner@firm.com"
              : preview.length >= MAX_BULK_EMAILS
                ? `First ${MAX_BULK_EMAILS} valid addresses will be submitted.`
                : `${preview.length} valid ${preview.length === 1 ? "address" : "addresses"} will be submitted.`
          }
        >
          <ControlTextarea
            id="admin-allowlist-emails"
            name="emails"
            required
            rows={5}
            value={emailsText}
            onChange={(event) => setEmailsText(event.target.value)}
            placeholder={"reviewer@example.com\npartner@example.com"}
            className="!text-[10px] leading-4"
            spellCheck={false}
            autoComplete="off"
          />
        </ControlField>

        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[9rem_minmax(0,1fr)]">
            <ControlField label="Initial status" as="div" controlId="admin-allowlist-status">
              <AdminStatusSelect
                name="status"
                defaultValue="invited"
                options={statusOptions}
                aria-label="Initial status"
              />
            </ControlField>

            <ControlField label="Notes" controlId="admin-allowlist-notes">
              <ControlInput
                id="admin-allowlist-notes"
                name="notes"
                placeholder="Cohort, source, or support context"
                className={cn(CONTROL_INPUT_SURFACE_CLASS, "h-7 !text-[10px]")}
              />
            </ControlField>
          </div>
          <div className="flex flex-col gap-2 border-t border-hairline pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[9px] leading-3 text-tertiary">New entries can sign in immediately.</p>
            <AddSubmitButton readyCount={preview.length} />
          </div>
        </div>
      </form>
    </section>
  );
}

function StatusFilterBar({
  statusFilter,
  counts,
}: {
  statusFilter: string;
  counts: Record<AdminAllowlistStatus, number> & { total: number };
}) {
  const active = statusFilter && statusOptions.some((option) => option.value === statusFilter) ? statusFilter : "";

  return (
    <div className="flex flex-wrap items-center gap-1" role="navigation" aria-label="Filter by status">
      <span className="mr-1 text-[9px] font-medium uppercase leading-3 text-tertiary">Status</span>
      {filterOptions.map((option) => {
        const href = option.value ? `${ALLOWLIST_PATH}?status=${option.value}` : ALLOWLIST_PATH;
        const isActive = active === option.value;
        return (
          <Link
            key={option.value || "all"}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-7 items-center rounded-xs border px-2 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              isActive
                ? "border-ink bg-ink text-white"
                : "border-hairline bg-white text-secondary hover:bg-surfaceMuted hover:text-ink",
            )}
          >
            {option.label}
            <span className={cn("ml-1 tabular-nums", isActive ? "text-white/70" : "text-tertiary")}>
              {option.value ? counts[option.value] : counts.total}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-2 text-[9px] leading-3 text-tertiary" aria-label="Status meanings">
      <li className="inline-flex items-center gap-1">
        <Badge tone="warning" size="xs" className="min-w-0 px-1">
          Invited
        </Badge>
        <span>can sign in; not yet active</span>
      </li>
      <li className="inline-flex items-center gap-1">
        <Badge tone="success" size="xs" className="min-w-0 px-1">
          Active
        </Badge>
        <span>signed in / confirmed</span>
      </li>
      <li className="inline-flex items-center gap-1">
        <Badge tone="danger" size="xs" className="min-w-0 px-1">
          Revoked
        </Badge>
        <span>blocked from sign-in</span>
      </li>
    </ul>
  );
}

/** Inline status + notes edit form shared by the desktop table cell and the mobile card. */
function AllowlistStatusEditor({
  row,
  mobile = false,
  onResult,
  onFailure,
}: AllowlistRowActionsProps) {
  if (mobile) {
    return (
      <form action={async (formData) => {
        try {
          onResult(await updateClosedBetaAllowlistEntry(formData));
        } catch {
          onFailure();
        }
      }} className="mt-2 grid gap-2">
        <input type="hidden" name="id" value={row.id} />
        <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <ControlField label="Status" as="div" className="gap-0.5">
            <AdminStatusSelect
              name="status"
              defaultValue={row.status}
              options={statusOptions}
              aria-label={`Status for ${row.normalized_email}`}
            />
          </ControlField>
          <ControlField label="Notes" className="gap-0.5">
            <ControlInput
              name="notes"
              defaultValue={row.notes ?? ""}
              aria-label={`Notes for ${row.normalized_email}`}
              placeholder="Add context"
              className={cn(CONTROL_INPUT_SURFACE_CLASS, "h-7 !text-[10px]")}
            />
          </ControlField>
        </div>
        <div className="flex">
          <RowSaveButton />
        </div>
      </form>
    );
  }

  return (
    <form
      action={async (formData) => {
        try {
          onResult(await updateClosedBetaAllowlistEntry(formData));
        } catch {
          onFailure();
        }
      }}
      className="grid grid-cols-[8rem_minmax(8rem,1fr)_auto] items-center gap-1"
    >
      <input type="hidden" name="id" value={row.id} />
      <AdminStatusSelect
        name="status"
        defaultValue={row.status}
        options={statusOptions}
        aria-label={`Status for ${row.normalized_email}`}
      />
      <ControlInput
        name="notes"
        defaultValue={row.notes ?? ""}
        aria-label={`Notes for ${row.normalized_email}`}
        placeholder="Add context"
        className={cn(CONTROL_INPUT_SURFACE_CLASS, "h-7 !text-[10px]")}
      />
      <RowSaveButton />
    </form>
  );
}

/** Revoke/restore actions with confirm dialog, shared by desktop and mobile rows. */
function AllowlistAccessActions({
  row,
  mobile = false,
  onResult,
  onFailure,
}: AllowlistRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submitRevoke() {
    const formData = new FormData();
    formData.set("id", row.id);
    formData.set("status", "revoked");
    formData.set("notes", row.notes ?? "");
    startTransition(async () => {
      try {
        const result = await updateClosedBetaAllowlistEntry(formData);
        onResult(result);
        if (result.ok) setConfirmOpen(false);
      } catch {
        onFailure();
      }
    });
  }

  return (
    <>
      {row.status === "revoked" ? (
        <form
          action={async (formData) => {
            try {
              onResult(await updateClosedBetaAllowlistEntry(formData));
            } catch {
              onFailure();
            }
          }}
          className={mobile ? undefined : "flex justify-end"}
        >
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="status" value="invited" />
          <input type="hidden" name="notes" value={row.notes ?? ""} />
          <Button
            type="submit"
            variant="secondary"
            size="xs"
            disabled={isPending}
            className={mobile ? "min-h-10" : undefined}
          >
            {mobile ? "Restore access" : "Restore"}
          </Button>
        </form>
      ) : (
        <div className={mobile ? undefined : "flex justify-end"}>
          <Button
            type="button"
            variant="danger"
            size="xs"
            disabled={isPending}
            className={mobile ? "min-h-10" : undefined}
            onClick={() => setConfirmOpen(true)}
          >
            {mobile ? "Revoke access" : "Revoke"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Revoke allowlist access"
        description={`${row.normalized_email} will be blocked from Google and magic-link sign-in until restored.`}
        confirmLabel={isPending ? "Revoking…" : "Revoke access"}
        cancelLabel="Keep access"
        tone="danger"
        busy={isPending}
        onConfirm={submitRevoke}
      />
    </>
  );
}

function AllowlistMobileCard({
  row,
  onResult,
  onFailure,
}: {
  row: AdminAllowlistRow;
  onResult: AllowlistActionResultHandler;
  onFailure: AllowlistActionFailureHandler;
}) {
  return (
    <article className="border-b border-hairline p-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-all text-[10px] font-medium leading-4 text-ink">{row.normalized_email}</p>
          <p className="mt-0.5 text-[9px] leading-3 text-tertiary">
            Invited {formatAdminDateTime(row.invited_at)}
          </p>
        </div>
        <Badge tone={statusTone[row.status]} size="xs" className="min-w-0 px-1">
          {statusLabels[row.status]}
        </Badge>
      </div>

      <div className="mt-2 rounded-xs bg-surfaceMuted/70 px-2 py-1.5 text-[9px] leading-3 text-secondary">
        {row.accepted_at ? `Signed in ${formatAdminDateTime(row.accepted_at)}` : "First sign-in pending"}
        {row.invite_email_sent_at ? ` · Invite sent ${formatAdminDateTime(row.invite_email_sent_at)}` : " · Invite email pending"}
      </div>

      <AllowlistStatusEditor row={row} mobile onResult={onResult} onFailure={onFailure} />
      <div className="mt-1.5 flex justify-end">
        <AllowlistAccessActions row={row} mobile onResult={onResult} onFailure={onFailure} />
      </div>
    </article>
  );
}

export function AdminAllowlistManager({
  authorized,
  error,
  rows,
  counts,
  statusFilter,
  notice,
}: AdminAllowlistManagerProps) {
  const { toast } = useToast();
  const onResult = useCallback<AllowlistActionResultHandler>((result) => {
    toast({
      id: "admin-allowlist-action",
      message: result.message,
      tone: result.ok ? (result.stale ? "warning" : "success") : "error",
    });
  }, [toast]);
  const onFailure = useCallback(() => {
    toast({
      id: "admin-allowlist-action",
      message: "Allowlist action could not be completed. Please try again.",
      tone: "error",
    });
  }, [toast]);
  const filterLabel =
    statusFilter && statusOptions.some((option) => option.value === statusFilter)
      ? statusLabels[statusFilter as AdminAllowlistStatus]
      : "All";

  const columns = useMemo<ColumnDef<AdminAllowlistRow, unknown>[]>(
    () => [
      {
        accessorKey: "normalized_email",
        header: "Person and delivery",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium leading-4 text-ink">{record.normalized_email}</p>
              <p className="mt-0.5 text-[9px] leading-3 text-tertiary">
                Invited {formatAdminDateTime(record.invited_at)}
                {record.accepted_at ? ` · Signed in ${formatAdminDateTime(record.accepted_at)}` : ""}
                {record.invite_email_sent_at
                  ? ` · Email sent ${formatAdminDateTime(record.invite_email_sent_at)}`
                  : " · Email pending"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "State",
        cell: ({ row }) => (
          <Badge tone={statusTone[row.original.status]} size="xs" className="min-w-0 px-1">
            {statusLabels[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "invited_at",
        header: "Invited",
        sortingFn: "datetime",
        cell: ({ row }) => (
          <span className="text-[9px] leading-3 text-tertiary">
            {formatAdminDateTime(row.original.invited_at)}
          </span>
        ),
      },
      {
        id: "context",
        header: "Status and internal context",
        enableSorting: false,
        cell: ({ row }) => <AllowlistStatusEditor row={row.original} onResult={onResult} onFailure={onFailure} />,
      },
      {
        id: "access",
        header: "Access",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => <AllowlistAccessActions row={row.original} onResult={onResult} onFailure={onFailure} />,
      },
    ],
    [onFailure, onResult],
  );

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Closed-beta allowlist"
        description="Listed emails can complete Google or magic-link sign-in when closed beta is on. Allowlist grants app access, not admin."
        actions={
          authorized ? (
            <Badge tone="neutral" size="xs" className="min-w-0 px-1 normal-case">
              {rows.length} shown · {filterLabel}
            </Badge>
          ) : undefined
        }
      />

      {authorized ? (
        <AdminOverviewStrip
          items={[
            { label: "Total access records", value: counts.total },
            { label: "Awaiting first sign-in", value: counts.invited, detail: "invited" },
            { label: "Confirmed access", value: counts.active, detail: "active" },
            { label: "Blocked access", value: counts.revoked, detail: "revoked" },
          ]}
        />
      ) : null}

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={cn(
            "rounded-xs border p-2 text-[10px] leading-4",
            notice.tone === "error"
              ? "border-dangerSoft bg-dangerSoft/40 text-danger"
              : "border-success/25 bg-success/10 text-ink",
          )}
        >
          {notice.text}
        </div>
      ) : null}

      {!authorized ? (
        <EmptyState
          icon={<EnvelopeSimple size={18} weight="regular" aria-hidden="true" />}
          title="Admin access required"
          description="Only platform admins can manage the closed-beta allowlist."
        />
      ) : (
        <>
          <AllowlistAddForm onResult={onResult} onFailure={onFailure} />

          <section className="overflow-hidden rounded-xs border border-hairline bg-white" aria-labelledby="allowlist-queue-heading">
            <div className="flex flex-col gap-2 border-b border-hairline p-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="allowlist-queue-heading" className="text-[11px] font-medium leading-4 text-ink">
                  Access directory
                </h2>
                <StatusLegend />
              </div>
              <StatusFilterBar statusFilter={statusFilter} counts={counts} />
            </div>

            {error ? (
              <div role="alert" className="m-2 rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
                {error}
              </div>
            ) : null}

            {rows.length === 0 ? (
              <div className="p-2">
                <EmptyState
                  icon={<EnvelopeSimple size={18} weight="regular" aria-hidden="true" />}
                  title={statusFilter ? "No emails match this filter" : "Allowlist is empty"}
                  description={
                    statusFilter
                      ? "Clear the status filter or add emails above."
                      : "Paste emails in the form above to grant closed-beta sign-in."
                  }
                  action={
                    statusFilter ? (
                      <Link
                        href={ALLOWLIST_PATH}
                        className="inline-flex min-h-7 cursor-pointer items-center rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        Show all
                      </Link>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div>
                <div className="md:hidden">
                  {rows.map((row) => (
                    <AllowlistMobileCard key={row.id} row={row} onResult={onResult} onFailure={onFailure} />
                  ))}
                </div>
                <div className="hidden md:block">
                  <AdminDataTable
                    data={rows}
                    columns={columns}
                    getRowId={(row) => row.id}
                    emptyMessage="No emails match this filter."
                    persistenceKey="admin-allowlist"
                    className="rounded-none border-0"
                  />
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </AdminPage>
  );
}
