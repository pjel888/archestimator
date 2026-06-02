# ui
- Use react-complex-tree (RCT) with ControlledTreeEnvironment for tree UIs. Confidence: 0.65
- Group nodes in estimate tree must be nestable within other group nodes (unlimited hierarchy depth). Confidence: 0.70
- For tree UIs: remove drag handles (dots icons), connector lines, and leaf dots — rely on indentation alone for hierarchy. Confidence: 0.70
- Drag-and-drop in tree UIs should render a ghost/placeholder at the drop target with sibling layout shift (not overlay). Confidence: 0.70
- For tree drag-and-drop: render exactly 2 "Drop at top level" ghost containers — one at the very top of the full tree and one at the very bottom, never between top-level sibling rows. Nested between-item targets use "Drop between rows"; inside-folder hover uses "Drop inside". Confidence: 0.80
- Estimate tree uses exactly 2 node types: Group Nodes (folder icon, no bg/border, nestable, organizational only) and Area Nodes (box icon). Only Area Nodes can contain EstimateRowItems. Confidence: 0.85
- Group Nodes use a simple folder icon with no background color and no border to keep the UI clean. Confidence: 0.75
- Maintain consistent header/breadcrumb layout across all project subpages: breadcrumbs in the topmost header, contained in one component, including the current page in the breadcrumb path (e.g., Workshop / Projects / Lewis Residence / Estimates). Confidence: 0.70
