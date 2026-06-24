import {
  ProjectEstimateFavoriteButton,
  type EstimateFavoriteParentProject,
  type EstimateFavoriteScope,
} from "@/components/workshop/ProjectEstimateFavoriteButton";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

import type { ProjectEstimateTableRow } from "./types";

type ProjectEstimateFavoriteActionCellProps = {
  estimate: ProjectEstimateTableRow;
  isSettling: boolean;
  store?: ProjectEstimatesStore;
  optimistic: boolean;
  parentProject?: EstimateFavoriteParentProject;
  scope?: EstimateFavoriteScope;
  announceCue?: () => void;
};

export function ProjectEstimateFavoriteActionCell({
  estimate,
  isSettling,
  store,
  optimistic,
  parentProject,
  scope,
  announceCue,
}: ProjectEstimateFavoriteActionCellProps) {
  const rowActionsDisabled = Boolean(estimate.pendingStatus) || isSettling;

  return (
    <div className="flex items-center justify-center">
      <ProjectEstimateFavoriteButton
        estimate={estimate}
        disabled={rowActionsDisabled}
        optimistic={optimistic}
        store={store}
        parentProject={parentProject}
        scope={scope}
        announceCue={announceCue}
      />
    </div>
  );
}

ProjectEstimateFavoriteActionCell.displayName = "ProjectEstimateFavoriteActionCell";
