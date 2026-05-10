-- Belongings placement metadata
-- Adds size classification and per-item dimensions to belongings, so inventory
-- captures whether an item belongs on the floor plan and what footprint to use
-- without needing a corresponding room_items row first.
--
-- Run after supabase-room-item-furniture-types.sql.

ALTER TABLE belongings ADD COLUMN IF NOT EXISTS size_class TEXT DEFAULT 'boxed';
ALTER TABLE belongings ADD COLUMN IF NOT EXISTS width_in NUMERIC;
ALTER TABLE belongings ADD COLUMN IF NOT EXISTS depth_in NUMERIC;
ALTER TABLE belongings ADD COLUMN IF NOT EXISTS height_in NUMERIC;

-- Backfill: any belonging that already has a matching room_items row is
-- demonstrably a floor-plan item; everything else defaults to boxed.
UPDATE belongings b
SET size_class = 'floorplan_item'
WHERE size_class IS DISTINCT FROM 'floorplan_item'
  AND EXISTS (
    SELECT 1 FROM room_items ri WHERE ri.belonging_id = b.id
  );

UPDATE belongings SET size_class = 'boxed' WHERE size_class IS NULL;

ALTER TABLE belongings DROP CONSTRAINT IF EXISTS belongings_size_class_check;
ALTER TABLE belongings ADD CONSTRAINT belongings_size_class_check
  CHECK (size_class IN ('floorplan_item', 'boxed'));

-- Backfill dimensions from any associated room_items rows. Take the first
-- non-null measurement we find per belonging.
UPDATE belongings b
SET width_in = sub.width_in,
    depth_in = sub.depth_in,
    height_in = sub.height_in
FROM (
  SELECT DISTINCT ON (belonging_id)
    belonging_id, width_in, depth_in, height_in
  FROM room_items
  WHERE belonging_id IS NOT NULL
    AND (width_in IS NOT NULL OR depth_in IS NOT NULL OR height_in IS NOT NULL)
  ORDER BY belonging_id, id
) sub
WHERE b.id = sub.belonging_id
  AND b.width_in IS NULL
  AND b.depth_in IS NULL
  AND b.height_in IS NULL;
