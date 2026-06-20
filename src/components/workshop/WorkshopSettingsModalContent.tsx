import { SignOut } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { WorkshopSettingsModalContentView } from "./WorkshopSettingsModalContentView";

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
