-- Source confidence is optional metadata. Display-only legacy sentinel values
-- must not persist as component confidence.
UPDATE cost_library_items
SET confidence = NULL
WHERE lower(trim(coalesce(confidence, ''))) IN ('current', 'no confidence');

UPDATE cost_library_item_price_options
SET confidence = NULL
WHERE lower(trim(coalesce(confidence, ''))) IN ('current', 'no confidence');

UPDATE cost_library_item_variant_cost_entries
SET confidence = NULL
WHERE lower(trim(coalesce(confidence, ''))) IN ('current', 'no confidence');
