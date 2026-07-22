import {
  DEV_REMOTE_BINDINGS_FLAG,
  isDevRemoteBindingsEnabled,
} from "@/lib/cloudflare/dev-remote-bindings";

export function AdminDevBindingsBanner() {
  if (process.env.NODE_ENV === "production") return null;

  const remoteBindingsEnabled = isDevRemoteBindingsEnabled();

  return (
    <div
      role="status"
      className="mb-3 rounded-xs border border-hairline bg-surfaceMuted px-3 py-2 text-[10px] leading-4 text-secondary"
    >
      {remoteBindingsEnabled ? (
        <>
          Local admin is using production D1 and R2. Support changes mutate live data. Email delivery remains local and still follows the local delivery flags. Unset <code>{DEV_REMOTE_BINDINGS_FLAG}</code> to return to isolated local bindings.
        </>
      ) : (
        <>
          Local admin is using isolated D1 and R2, so production support email will not appear here. Set <code>{DEV_REMOTE_BINDINGS_FLAG}=1</code> to use production bindings, or run <code>bun run cf:d1-sync-from-remote</code> for a local snapshot.
        </>
      )}
    </div>
  );
}
