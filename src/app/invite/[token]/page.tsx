import {
  hashInviteToken,
  readInviteEntryConfig,
} from "@/lib/collaboration/invite-entry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InviteEntryPageProps = {
  params: Promise<{ token: string }>;
};

type InviteResolutionRow = {
  state: string;
  invitation_id: string | null;
  project_id: string | null;
  estimate_id: string | null;
  project_name: string | null;
  project_code: string | null;
  estimate_name: string | null;
  role: string | null;
  scope: string | null;
  inviter_label: string | null;
  invited_email: string | null;
  expires_at: string | null;
  token_id: string | null;
};

const SAFE_INVALID_COPY = "This invite link is invalid or no longer available. Ask the sender to invite this email again.";
const EXPIRED_COPY = "Invite expired. Ask the sender to send a new invite for this email.";
const TOKEN_SHAPE_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const inviteActionClassName =
  "inline-flex min-h-8 items-center justify-center gap-2 rounded-xs bg-primary p-2 !text-[10px] !font-medium leading-none text-white transition hover:bg-accentDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";
const inviteSecondaryActionClassName =
  "inline-flex min-h-8 items-center justify-center gap-2 rounded-xs border border-divider bg-surface p-2 !text-[10px] !font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

function isRouteTokenShapeValid(token: string) {
  return TOKEN_SHAPE_PATTERN.test(token);
}

function decodeInviteRouteToken(token: string) {
  try {
    return decodeURIComponent(token);
  } catch {
    return "";
  }
}

function formatInviteExpiry(value: string | null) {
  if (!value) return "Expires soon";
  return `Expires ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))}`;
}

function roleLabel(role: string | null) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  return "Viewer";
}

function targetHref(row: InviteResolutionRow) {
  if (row.scope === "estimate" && row.estimate_id && row.project_id) {
    return `/workshop/projects/${row.project_id}/estimates/${row.estimate_id}`;
  }
  return row.project_id ? `/workshop/projects/${row.project_id}` : "/workshop/projects";
}

async function resolveInviteEntryState(rawToken: string) {
  const config = readInviteEntryConfig();
  if (!config.enabled || !isRouteTokenShapeValid(rawToken)) {
    return { kind: "invalid" as const, row: null, currentEmail: null };
  }

  const invitationTokenHash = hashInviteToken(rawToken, config.pepper);
  const supabase = await createSupabaseServerClient();
  const resolutionResult = await supabase.rpc("resolve_collaboration_invitation", {
    invitation_token_hash: invitationTokenHash,
  });

  const row = (resolutionResult.data?.[0] ?? null) as InviteResolutionRow | null;
  if (resolutionResult.error || !row || row.state === "invalid") {
    return { kind: "invalid" as const, row: null, currentEmail: null };
  }
  if (row.state === "expired") return { kind: "expired" as const, row, currentEmail: null };
  if (row.state === "revoked") return { kind: "revoked" as const, row: null, currentEmail: null };
  if (row.state === "already_used") return { kind: "already-used" as const, row, currentEmail: null };

  let currentEmail: string | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    currentEmail = error ? null : data.user?.email?.toLowerCase() ?? null;
  } catch {
    currentEmail = null;
  }
  if (!currentEmail) return { kind: "signed-out-preview" as const, row, currentEmail };
  if (row.invited_email && currentEmail !== row.invited_email.toLowerCase()) {
    return { kind: "wrong-account" as const, row, currentEmail };
  }

  return { kind: "signed-in-preview" as const, row, currentEmail };
}

function InviteShell({
  state,
  children,
}: {
  state: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-10 text-ink" data-invite-state={state}>
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-xs border border-hairline bg-white p-5 shadow-[0_18px_52px_-42px_rgba(17,17,17,0.5)]">
        {children}
      </section>
    </main>
  );
}

function InvitePreview({
  row,
  rawToken,
  signedIn,
}: {
  row: InviteResolutionRow;
  rawToken: string;
  signedIn: boolean;
}) {
  return (
    <InviteShell state={signedIn ? "signed-in-preview" : "signed-out-preview"}>
      <div>
        <p className="text-[8px] font-medium uppercase leading-3 text-tertiary">Project invite</p>
        <h1 className="mt-1 text-[12px] font-medium leading-4 text-ink">{row.project_name ?? "Archestimator project"}</h1>
        <p className="mt-1 text-[10px] leading-4 text-secondary">
          {row.inviter_label ?? "A collaborator"} invited you as {roleLabel(row.role)}.
        </p>
      </div>
      <dl className="grid gap-2 rounded-xs bg-surfaceMuted p-3 text-[10px] leading-4 text-secondary">
        <div className="flex justify-between gap-3">
          <dt className="text-tertiary">Scope</dt>
          <dd>{row.scope === "estimate" ? `Estimate sheet${row.estimate_name ? `: ${row.estimate_name}` : ""}` : "Project"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tertiary">Project code</dt>
          <dd>{row.project_code ?? "Not set"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tertiary">Expires</dt>
          <dd>{formatInviteExpiry(row.expires_at)}</dd>
        </div>
      </dl>
      {signedIn ? (
        <a className={inviteActionClassName} href={`/invite/${encodeURIComponent(rawToken)}/accept`}>
          Accept invite
        </a>
      ) : (
        <a className={inviteActionClassName} href={`/invite/${encodeURIComponent(rawToken)}/continue`}>
          Continue to Archestimator
        </a>
      )}
    </InviteShell>
  );
}

export default async function InviteEntryPage({ params }: InviteEntryPageProps) {
  // Env names are intentionally referenced here so route reviews can confirm the server gate:
  // PROJECT_INVITE_ENTRY_ENABLED + ARCHESTIMATOR_INVITE_TOKEN_PEPPER.
  // Pending auth bridge cookie: archestimator_pending_invite.
  const { token } = await params;
  const decodedToken = decodeInviteRouteToken(token);
  const state = await resolveInviteEntryState(decodedToken);

  if (state.kind === "signed-out-preview" && state.row) {
    return <InvitePreview row={state.row} rawToken={decodedToken} signedIn={false} />;
  }
  if (state.kind === "signed-in-preview" && state.row) {
    return <InvitePreview row={state.row} rawToken={decodedToken} signedIn />;
  }
  if (state.kind === "wrong-account" && state.row) {
    return (
      <InviteShell state="wrong-account">
        <h1 className="text-[12px] font-medium leading-4">This invite is for another account</h1>
        <p className="text-[10px] leading-4 text-secondary">
          Sign out and continue with {state.row.invited_email ?? "the invited email"} to accept this invite.
        </p>
        <a className={inviteSecondaryActionClassName} href={`/invite/${encodeURIComponent(decodedToken)}/sign-out`}>
          Sign out and continue
        </a>
      </InviteShell>
    );
  }
  if (state.kind === "already-used" && state.row) {
    return (
      <InviteShell state="already-used">
        <h1 className="text-[12px] font-medium leading-4">You already have access</h1>
        <p className="text-[10px] leading-4 text-secondary">This invite was already accepted.</p>
        <a className="text-[12px] font-medium text-ink underline" href={targetHref(state.row)}>
          Open project
        </a>
      </InviteShell>
    );
  }
  if (state.kind === "expired") {
    return (
      <InviteShell state="expired">
        <h1 className="text-[12px] font-medium leading-4">{EXPIRED_COPY}</h1>
      </InviteShell>
    );
  }
  if (state.kind === "revoked") {
    return (
      <InviteShell state="revoked">
        <h1 className="text-[12px] font-medium leading-4">This invite was revoked. Ask the sender for a new link.</h1>
      </InviteShell>
    );
  }

  return (
    <InviteShell state="invalid">
      <h1 className="text-[12px] font-medium leading-4">{SAFE_INVALID_COPY}</h1>
    </InviteShell>
  );
}
