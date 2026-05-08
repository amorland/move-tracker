-- Allow room items to be positioned anywhere on a measured floor canvas.
-- Run after supabase-measured-layout.sql.

ALTER TABLE room_items ADD COLUMN IF NOT EXISTS floor_plan_id BIGINT;

DO $$
BEGIN
  ALTER TABLE room_items
    ADD CONSTRAINT room_items_floor_plan_id_fkey
    FOREIGN KEY (floor_plan_id)
    REFERENCES home_floor_plans(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_room_items_floor_plan ON room_items(floor_plan_id);

UPDATE rooms
SET floor_plan_id = home_floor_plans.id
FROM home_floor_plans
WHERE rooms.floor_plan_id IS NULL
  AND rooms.floor = home_floor_plans.name;

UPDATE room_items
SET floor_plan_id = rooms.floor_plan_id
FROM rooms
WHERE room_items.floor_plan_id IS NULL
  AND room_items.room_id = rooms.id
  AND rooms.floor_plan_id IS NOT NULL;
