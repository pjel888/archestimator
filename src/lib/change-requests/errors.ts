export type ProjectChangeRequestErrorCode =
  | "project_change_request_batch_required"
  | "project_change_request_conflict"
  | "project_change_request_forbidden"
  | "project_change_request_invalid_input"
  | "project_change_request_invalid_transition"
  | "project_change_request_not_found"
  | "project_change_request_write_failed";

export class ProjectChangeRequestError extends Error {
  constructor(
    readonly code: ProjectChangeRequestErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectChangeRequestError";
  }
}
