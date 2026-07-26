DROP TRIGGER IF EXISTS project_change_requests_status_transition;

CREATE TRIGGER project_change_requests_status_transition
BEFORE UPDATE OF status ON project_change_requests
WHEN NEW.status IS NOT OLD.status
BEGIN
  SELECT CASE WHEN NOT (
    (OLD.status = 'initializing' AND NEW.status = 'submitted')
    OR (OLD.status = 'submitted' AND NEW.status IN ('acknowledged', 'under_assessment', 'rejected', 'withdrawn'))
    OR (OLD.status = 'acknowledged' AND NEW.status IN ('under_assessment', 'rejected', 'withdrawn'))
    OR (OLD.status = 'under_assessment' AND NEW.status IN ('proposal_issued', 'rejected', 'withdrawn'))
    OR (OLD.status = 'proposal_issued' AND NEW.status IN ('under_assessment', 'resolved', 'rejected', 'withdrawn'))
  ) THEN RAISE(ABORT, 'invalid change request status transition') END;
END;
