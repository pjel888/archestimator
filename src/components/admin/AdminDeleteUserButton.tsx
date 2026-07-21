"use client";

import { useState, useTransition } from "react";
import { Trash, WarningDiamond } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  type DeleteAccountPreview,
} from "@/lib/auth/delete-account-shared";
import {
  deleteUserAction,
  getDeleteUserPreviewAction,
  type DeleteUserActionState,
} from "@/lib/admin/user-actions";

const initialState: DeleteUserActionState = { ok: false };

export function AdminDeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<DeleteAccountPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [loadingPreview, startPreviewTransition] = useTransition();
  const [state, setState] = useState<DeleteUserActionState>(initialState);
  const [pending, startDeleteTransition] = useTransition();

  function openModal() {
    setOpen(true);
    setPreview(null);
    setPreviewError(null);
    setConfirmation("");
    setState(initialState);
    startPreviewTransition(() => {
      void getDeleteUserPreviewAction(userId)
        .then((result) => setPreview(result))
        .catch(() => setPreviewError("Could not check account deletion readiness."));
    });
  }

  function submitDelete(formData: FormData) {
    startDeleteTransition(async () => {
      const result = await deleteUserAction(userId, state, formData);
      setState(result);
      if (result.ok) setOpen(false);
    });
  }

  const blockers = state.blockers ?? preview?.blockers ?? [];
  const blocked = Boolean(preview && !preview.ok) || blockers.length > 0;
  const canSubmit =
    Boolean(preview?.ok) &&
    confirmation.trim() === DELETE_ACCOUNT_CONFIRMATION_PHRASE &&
    !pending &&
    !loadingPreview &&
    !blocked;

  return (
    <>
      <Button
        size="icon-xs"
        variant="danger"
        disabled={pending}
        onClick={openModal}
        aria-label={`Delete ${email}`}
        title="Delete account"
      >
        <Trash aria-hidden size={13} />
      </Button>

      <Modal
        open={open}
        title={`Delete ${email}?`}
        description="This applies the same account deletion process used in Settings. It cannot be undone."
        tone="danger"
        className="max-w-lg"
        onOpenChange={setOpen}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xs border border-dangerSoft bg-dangerSoft/20 p-2">
            <WarningDiamond size={14} weight="regular" className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            <p className="text-[10px] leading-4 text-secondary">
              This closes the account, removes workshop access, and retains the internal deletion record for operations.
            </p>
          </div>

          {loadingPreview ? <p className="text-[10px] leading-4 text-tertiary">Checking ownership and shared access…</p> : null}

          {previewError ? (
            <p className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger" role="alert">
              {previewError}
            </p>
          ) : null}

          {state.error ? (
            <p className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger" role="alert">
              {state.error}
            </p>
          ) : null}

          {blockers.length > 0 ? (
            <ul className="space-y-1 rounded-xs border border-dangerSoft bg-white p-2">
              {blockers.map((blocker) => (
                <li key={`${blocker.code}:${blocker.workspaceId ?? blocker.corporateAccountId ?? blocker.message}`} className="text-[10px] leading-4 text-danger">
                  {blocker.message}
                </li>
              ))}
            </ul>
          ) : null}

          {preview?.ok ? (
            <div className="space-y-1 rounded-xs border border-hairline bg-white p-2 text-[10px] leading-4 text-secondary">
              <p>Sole-owned workspaces to close: {preview.closedWorkspaceNames.length > 0 ? preview.closedWorkspaceNames.join(", ") : "none"}</p>
              <p>Shared workspaces to leave: {preview.leftWorkspaceNames.length > 0 ? preview.leftWorkspaceNames.join(", ") : "none"}</p>
              <p>Public links to revoke: {preview.publicationRevokeCount}. Client portals to disable: {preview.portalDisableCount}. Pending invites to revoke: {preview.pendingInviteRevokeCount}.</p>
              <p>Signing up again with the same email starts a fresh empty account.</p>
            </div>
          ) : null}

          <form action={submitDelete} className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-medium leading-4 text-ink">Type {DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm</span>
              <input
                name="confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={blocked || loadingPreview || pending}
                className="h-8 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="md" onClick={() => setOpen(false)} disabled={pending}>Keep account</Button>
              <Button type="submit" variant="danger" size="md" disabled={!canSubmit}>{pending ? "Deleting…" : "Delete account"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
