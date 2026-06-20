"use client";

import dynamic from "next/dynamic";
import { SignOut } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

// Heavy settings body kept out of the shared workshop client chunk. The settings
// dialog renders nothing while closed (the dialog portal returns null), so this
// view only mounts — and its chunk only loads — on first open. The static
// trigger/wrapper and sign-out form below are unchanged, so closed-state UI and
// how the dialog opens are identical.
const WorkshopSettingsModalContentView = dynamic(
  () => import("./WorkshopSettingsModalContentView").then((mod) => mod.WorkshopSettingsModalContentView),
  { ssr: false },
);

export function WorkshopSettingsModalContent({ canManagePlatform }: { canManagePlatform: boolean }) {
  return (
    <WorkshopSettingsModalContentView
      canManagePlatform={canManagePlatform}
      signOutControl={
        <form action={signOut}>
          <Button type="submit" variant="danger" size="sm" className="shrink-0 whitespace-nowrap">
            <SignOut className="size-3" aria-hidden="true" />
            Sign out
          </Button>
        </form>
      }
    />
  );
}
