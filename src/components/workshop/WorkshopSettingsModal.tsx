"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GearSix } from "@phosphor-icons/react/dist/ssr";

import { IconButton } from "@/components/ui/icon-button";
import {
  PROJECT_HEADER_ACTION_BUTTON_CLASS,
  PROJECT_HEADER_ACTION_ICON_SIZE,
} from "@/components/workshop/project-header-action-styles";
import { Modal } from "@/components/ui/modal";
import { subscribeToModalLifecycle } from "@/components/ui/overlays/modal-lifecycle";

type WorkshopSettingsModalProps = {
  children: ReactNode;
  closeHref?: string;
  initialOpen?: boolean;
  location?: ReactNode;
  trigger?: "button" | "none";
};

type WorkshopSettingsModalContextValue = {
  closeBeforeNavigate: (href: string) => void;
};

const WorkshopSettingsModalContext = createContext<WorkshopSettingsModalContextValue | null>(null);

export function useWorkshopSettingsModal() {
  const context = use(WorkshopSettingsModalContext);
  if (!context) throw new Error("useWorkshopSettingsModal must be used inside WorkshopSettingsModal.");
  return context;
}

export function WorkshopSettingsModal({
  children,
  closeHref,
  initialOpen = false,
  location,
  trigger = "button",
}: WorkshopSettingsModalProps) {
  const [open, setOpen] = useState(initialOpen);
  const pendingNavigationRef = useRef<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && trigger === "button") {
      const unsubscribe = subscribeToModalLifecycle((event) => {
        if (event.type !== "closed_focus_restored" || event.activeModalCount !== 0) return;
        unsubscribe();
        window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
      });
    }
    if (!nextOpen && closeHref && !pendingNavigationRef.current) {
      window.location.assign(closeHref);
    }
  }

  const closeBeforeNavigate = useCallback((href: string) => {
    pendingNavigationRef.current = href;
    const unsubscribe = subscribeToModalLifecycle((event) => {
      if (
        event.type !== "closed_focus_restored"
        || event.activeModalCount !== 0
        || !pendingNavigationRef.current
      ) return;
      const destination = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      unsubscribe();
      window.location.assign(destination);
    });
    setOpen(false);
  }, []);
  const modalContext = useMemo(
    () => ({ closeBeforeNavigate }),
    [closeBeforeNavigate],
  );

  return (
    <WorkshopSettingsModalContext.Provider value={modalContext}>
      {trigger === "button" ? (
        <IconButton
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          label="Open settings"
          title={undefined}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={PROJECT_HEADER_ACTION_BUTTON_CLASS}
          onClick={() => setOpen(true)}
          icon={<GearSix size={PROJECT_HEADER_ACTION_ICON_SIZE} weight="regular" aria-hidden="true" />}
        />
      ) : null}
      <Modal
        open={open}
        title="Settings"
        description="Manage account, workspace, support, and guidance."
        closeLabel="Close settings"
        className="max-w-[920px]"
        bodyClassName="bg-white p-0"
        initialFocus="content"
        location={location}
        onOpenChange={handleOpenChange}
      >
        {children}
      </Modal>
    </WorkshopSettingsModalContext.Provider>
  );
}
