-- Add a general estimate-node category for proposal preliminaries and site works.

alter type public.estimate_node_kind add value if not exists 'general';
