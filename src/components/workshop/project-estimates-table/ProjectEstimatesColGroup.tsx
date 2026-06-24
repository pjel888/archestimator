import type { Table } from "@tanstack/react-table";

import type { ProjectEstimateTableRow } from "./types";

export function ProjectEstimatesColGroup({ table }: { table: Table<ProjectEstimateTableRow> }) {
  return (
    <colgroup>
      {table.getVisibleLeafColumns().map((column) => (
        <col key={column.id} style={{ width: `${column.getSize()}px` }} />
      ))}
    </colgroup>
  );
}

ProjectEstimatesColGroup.displayName = "ProjectEstimatesColGroup";
