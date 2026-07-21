"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminStatusSelect } from "@/app/workshop/settings/_components/AdminStatusSelect";
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
import { cn } from "@/lib/ui/cn";
import {
  createClosedBetaAllowlistEntries,
  updateClosedBetaAllowlistEntry,
} from "@/lib/auth/beta-allowlist-admin-actions";

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
  statusFilter: string;
  notice: AdminAllowlistNotice;
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

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

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
    <Button type="submit" variant="primary" size="xs" disabled={pending || readyCount === 0} className="min-w-[7.5rem]">
      {pending ? "Adding…" : label}
    </Button>
  );
}

function RowSaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="xs" disabled={pending} className="min-w-[4.5rem]">
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function AllowlistAddForm() {
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

      <form action={createClosedBetaAllowlistEntries} className="mt-2 grid gap-2">
        <input type="hidden" name="returnPath" value={ALLOWLIST_PATH} />

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
            rows={4}
            value={emailsText}
            onChange={(event) => setEmailsText(event.target.value)}
            placeholder={"reviewer@example.com\npartner@example.com"}
            className="!text-[10px] leading-4"
            spellCheck={false}
            autoComplete="off"
          />
        </ControlField>

        <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)_auto] md:items-end">
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

          <AddSubmitButton readyCount={preview.length} />
        </div>
      </form>
    </section>
  );
}

function StatusFilterBar({ statusFilter }: { statusFilter: string }) {
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

function AllowlistRowEditor({ row }: { row: AdminAllowlistRow }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submitRevoke() {
    const formData = new FormData();
    formData.set("returnPath", ALLOWLIST_PATH);
    formData.set("id", row.id);
    formData.set("status", "revoked");
    formData.set("notes", row.notes ?? "");
    startTransition(async () => {
      await updateClosedBetaAllowlistEntry(formData);
    });
  }

  return (
    <>
      <tr className="align-top">
        <td className="border-b border-hairline px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium leading-4 text-ink">{row.normalized_email}</p>
            <p className="mt-0.5 text-[9px] leading-3 text-tertiary">
              Invited {formatDate(row.invited_at)}
              {row.accepted_at ? ` · Signed in ${formatDate(row.accepted_at)}` : ""}
              {row.invite_email_sent_at ? ` · Email sent ${formatDate(row.invite_email_sent_at)}` : " · Email pending"}
            </p>
          </div>
        </td>
        <td className="border-b border-hairline px-2 py-2">
          <Badge tone={statusTone[row.status]} size="xs" className="min-w-0 px-1">
            {statusLabels[row.status]}
          </Badge>
        </td>
        <td className="border-b border-hairline px-2 py-2">
          <form
            action={updateClosedBetaAllowlistEntry}
            className="grid gap-1 md:grid-cols-[9rem_minmax(0,1fr)_auto] md:items-end"
          >
            <input type="hidden" name="returnPath" value={ALLOWLIST_PATH} />
            <input type="hidden" name="id" value={row.id} />
            <ControlField label="Status" as="div" className="gap-0.5">
              <AdminStatusSelect
                name="status"
                defaultValue={row.status}
                options={statusOptions}
                aria-label={`Status for ${row.normalized_email}`}
                className="min-w-28"
              />
            </ControlField>
            <ControlField label="Notes" className="gap-0.5">
              <ControlInput
                name="notes"
                defaultValue={row.notes ?? ""}
                aria-label={`Notes for ${row.normalized_email}`}
                className={cn(CONTROL_INPUT_SURFACE_CLASS, "h-7 !text-[10px]")}
              />
            </ControlField>
            <RowSaveButton />
          </form>
        </td>
        <td className="border-b border-hairline px-2 py-2">
          {row.status === "revoked" ? (
            <form action={updateClosedBetaAllowlistEntry}>
              <input type="hidden" name="returnPath" value={ALLOWLIST_PATH} />
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="status" value="invited" />
              <input type="hidden" name="notes" value={row.notes ?? ""} />
              <Button type="submit" variant="secondary" size="xs" disabled={isPending}>
                Restore
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="danger"
              size="xs"
              disabled={isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Revoke
            </Button>
          )}
        </td>
      </tr>

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

export function AdminAllowlistManager({
  authorized,
  error,
  rows,
  statusFilter,
  notice,
}: AdminAllowlistManagerProps) {
  const filterLabel =
    statusFilter && statusOptions.some((option) => option.value === statusFilter)
      ? statusLabels[statusFilter as AdminAllowlistStatus]
      : "All";

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
          <AllowlistAddForm />

          <section className="rounded-xs border border-hairline bg-white p-2" aria-labelledby="allowlist-queue-heading">
            <div className="flex flex-col gap-2 border-b border-hairline pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="allowlist-queue-heading" className="text-[11px] font-medium leading-4 text-ink">
                  Allowlist
                </h2>
                <StatusLegend />
              </div>
              <StatusFilterBar statusFilter={statusFilter} />
            </div>

            {error ? (
              <div role="alert" className="mt-2 rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
                {error}
              </div>
            ) : null}

            {rows.length === 0 ? (
              <div className="mt-2">
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
                        className="inline-flex min-h-7 items-center rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        Show all
                      </Link>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[10px] leading-4">
                  <thead className="bg-surfaceMuted text-secondary">
                    <tr>
                      <th className="border-b border-hairline px-2 py-1.5 font-medium">Email</th>
                      <th className="border-b border-hairline px-2 py-1.5 font-medium">Status</th>
                      <th className="border-b border-hairline px-2 py-1.5 font-medium">Edit</th>
                      <th className="border-b border-hairline px-2 py-1.5 font-medium">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <AllowlistRowEditor key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AdminPage>
  );
}
