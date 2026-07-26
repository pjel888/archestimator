"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ButtonLink } from "@/components/ui/button";
import {
  ONBOARDING_RUNTIME_BINDING_EVENT,
  type OnboardingRuntimeBindingEventDetail,
} from "@/components/onboarding/onboarding-runtime-events";
import {
  completeClientLinkLearning,
  publishClientLinkForLearning,
  type ClientLinkLearningCompletionResult,
  type ClientLinkLearningPublishResult,
  type ClientLinkLearningVerificationMethod,
} from "@/lib/onboarding/client-link-learning";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";
import type { ProjectPublicationLocationVisibility } from "@/lib/publication/types";

type RuntimeBinding = OnboardingRuntimeBindingEventDetail;
type PublicationProof = {
  expectedRevision: number;
  receipt: string;
};

type ClientLinksLearningContextValue = {
  active: boolean;
  publish: (input: {
    projectId: string;
    selectedEstimateIds: string[];
    password?: string;
    clearPassword?: boolean;
    expiresAt?: string | null;
    locationVisibility?: ProjectPublicationLocationVisibility | null;
    actionKind: "create" | "republish";
  }) => Promise<ClientLinkLearningPublishResult | null>;
  complete: (
    projectId: string,
    method: ClientLinkLearningVerificationMethod,
  ) => Promise<ClientLinkLearningCompletionResult | null>;
};

const ClientLinksLearningContext =
  createContext<ClientLinksLearningContextValue | null>(null);

const LESSONS = [
  "Review client links",
  "Scope and publish",
  "Verify and share",
  "Recipients and activity",
  "Keep links current",
  "Replace or turn off safely",
] as const;

function createMutationId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function useClientLinksLearning() {
  return useContext(ClientLinksLearningContext);
}

export function ClientLinksLearningRail({
  children,
  snapshot,
}: {
  children: ReactNode;
  snapshot: OnboardingEligibilitySnapshot | null;
}) {
  const [runtime, setRuntime] = useState<RuntimeBinding | null>(null);
  const [proof, setProof] = useState<PublicationProof | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const flowState = snapshot?.flowStates.find(
    (state) => state.flowKey === "client_link_publishing",
  );
  const canManage = snapshot?.capabilities.includes("manage_client_links")
    && snapshot.dataPredicates.client_link_project_available === true;
  const completed = flowState?.status === "completed"
    || status === "Client link lesson complete.";

  useEffect(() => {
    function handleRuntimeBinding(event: Event) {
      const detail = (event as CustomEvent<RuntimeBinding>).detail;
      if (detail?.flowKey !== "client_link_publishing") return;
      setRuntime(detail);
      setProof((current) =>
        current?.expectedRevision === detail.revision
          ? current
          : null,
      );
    }
    window.addEventListener(
      ONBOARDING_RUNTIME_BINDING_EVENT,
      handleRuntimeBinding,
    );
    return () => {
      window.removeEventListener(
        ONBOARDING_RUNTIME_BINDING_EVENT,
        handleRuntimeBinding,
      );
    };
  }, []);

  const publish = useCallback<ClientLinksLearningContextValue["publish"]>(
    async (input) => {
      if (!runtime || runtime.flowKey !== "client_link_publishing") return null;
      const result = await publishClientLinkForLearning({
        ...input,
        runId: runtime.runId,
        expectedRevision: runtime.revision,
      });
      setStatus(result.message);
      if (result.ok) {
        setProof({
          expectedRevision: runtime.revision,
          receipt: result.receipt,
        });
      } else {
        setProof(null);
      }
      return result;
    },
    [runtime],
  );

  const complete = useCallback<ClientLinksLearningContextValue["complete"]>(
    async (projectId, method) => {
      if (!proof) return null;
      const result = await completeClientLinkLearning({
        projectId,
        receipt: proof.receipt,
        method,
        mutationId: createMutationId(),
      });
      setStatus(result.ok ? "Client link lesson complete." : result.message);
      if (result.ok || result.code === "publication_proof_replayed") {
        setProof(null);
      }
      return result;
    },
    [proof],
  );

  const contextValue = useMemo<ClientLinksLearningContextValue>(
    () => ({
      active: Boolean(runtime && !completed),
      publish,
      complete,
    }),
    [complete, completed, publish, runtime],
  );

  if (!snapshot || !canManage) return children;

  return (
    <ClientLinksLearningContext.Provider value={contextValue}>
      <div className="flex h-full min-h-0 flex-col gap-2">
        <aside
          aria-label="Client links learning"
          className="shrink-0 rounded-xs border border-hairline bg-white px-3 py-2 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wide text-tertiary">
                Focused lesson
              </p>
              <h2 className="text-[11px] font-medium text-ink">
                Publish and verify a client link
              </h2>
            </div>
            <ButtonLink
              variant="secondary"
              size="sm"
              href={`/workshop/publisher?tour=client_link_publishing&mode=${completed ? "replay" : flowState?.status === "in_progress" ? "resume" : "start"}`}
            >
                {completed
                  ? "View again"
                  : flowState?.status === "in_progress"
                    ? "Resume guide"
                    : flowState?.status === "dismissed"
                      ? "Start guide again"
                      : "Start guide"}
            </ButtonLink>
          </div>
          <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] leading-3 text-secondary">
            {LESSONS.map((lesson, index) => (
              <li key={lesson}>{index + 1}. {lesson}</li>
            ))}
          </ol>
          {status ? (
            <p role="status" className="mt-2 text-[9px] leading-3 text-secondary">
              {status}
            </p>
          ) : null}
        </aside>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </ClientLinksLearningContext.Provider>
  );
}
