export type ProjectArtifactErrorCode =
  | "project_artifact_batch_required"
  | "project_artifact_conflict"
  | "project_artifact_invalid_file"
  | "project_artifact_invalid_input"
  | "project_artifact_not_found"
  | "project_artifact_retained"
  | "project_artifact_upload_not_publishable"
  | "project_artifact_write_failed";

export class ProjectArtifactError extends Error {
  constructor(
    readonly code: ProjectArtifactErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectArtifactError";
  }
}
