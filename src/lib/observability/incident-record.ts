import "server-only";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import type { BuiltOperationalIncident } from "@/lib/observability/incident-record-core";

export * from "@/lib/observability/incident-record-core";

export async function recordOperationalIncidentInD1(
  db: D1DatabaseLike,
  rows: BuiltOperationalIncident,
): Promise<{ incidentId: string; eventId: string }> {
  const incidentStatement = db
    .prepare(
      `
        INSERT INTO operational_incidents (
          id, declared_at, severity, status, owner, summary,
          root_cause, related_request_ids, closed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      rows.incident.id,
      rows.incident.declared_at,
      rows.incident.severity,
      rows.incident.status,
      rows.incident.owner,
      rows.incident.summary,
      rows.incident.root_cause,
      rows.incident.related_request_ids,
      rows.incident.closed_at,
    );

  const eventStatement = db
    .prepare(
      `
        INSERT INTO operational_incident_events (
          id, incident_id, occurred_at, event_kind, actor, detail
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      rows.event.id,
      rows.event.incident_id,
      rows.event.occurred_at,
      rows.event.event_kind,
      rows.event.actor,
      rows.event.detail,
    );

  if (db.batch) {
    await db.batch([incidentStatement, eventStatement]);
  } else {
    await incidentStatement.run();
    await eventStatement.run();
  }

  return { incidentId: rows.incident.id, eventId: rows.event.id };
}
